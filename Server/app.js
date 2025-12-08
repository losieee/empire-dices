require("dotenv").config()
const express = require("express")
const http = require("http")
const cors = require("cors")
const WebSocket = require("ws")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")
const path = require("path")
const authRouter = require("./routes/auth")

const app = express()
app.use(cors())
app.use(express.json())
app.use("/auth", authRouter)

app.get("/test", (req, res) => {
    res.sendFile(path.join(__dirname, "test.html"))
})

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "empire_dice"
})

wss.on("connection", (ws) => {
    ws.on("message", async (raw) => {
        const msg = JSON.parse(raw)
        const t = msg.type

        if (t === "auth") {
            try {
                const decoded = jwt.verify(msg.token, process.env.JWT_SECRET)
                ws.user = decoded
                ws.send(JSON.stringify({ type:"auth_ok", userId:decoded.user_id }))
            } catch (e) {
                ws.send(JSON.stringify({ type:"auth_fail" }))
            }
        }

        if (t === "reconnect") {
            const sessionId = msg.sessionId
            ws.sessionId = sessionId

            const [states] = await pool.query(
                "SELECT user_id,board_position,coin,empire_hp,shield_count,turn_skip_count,silence_count FROM player_states WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"stateUpdate", states }))

            const [updatedTiles] = await pool.query(
                "SELECT index_pos,tile_type,value FROM board_tiles WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"boardSync", tiles:updatedTiles }))

            const [inv] = await pool.query(
                "SELECT p.id,p.weapon_id,w.name,w.effect_type,w.value FROM player_weapons p JOIN weapons w ON p.weapon_id=w.weapon_id WHERE p.session_id=? AND p.user_id=?",
                [sessionId,ws.user.user_id]
            )
            ws.send(JSON.stringify({ type:"weaponUpdate", inventory:inv }))

            const [turn] = await pool.query(
                "SELECT current_turn FROM game_sessions WHERE session_id=?",
                [sessionId]
            )
            ws.send(JSON.stringify({ type:"turnChange", nextTurn:turn[0].current_turn }))
        }

        if (t === "createRoom") {
            const userId = ws.user.user_id
            const [result] = await pool.query(
                "INSERT INTO game_sessions (player1_id,status,created_at) VALUES (?,'waiting',NOW())",
                [userId]
            )
            ws.sessionId = result.insertId.toString()
            ws.send(JSON.stringify({ type:"roomCreated", sessionId:ws.sessionId }))
        }

        if (t === "joinRoom") {
            const sessionId = msg.sessionId
            ws.sessionId = sessionId
            const userId = ws.user.user_id

            await pool.query(
                "UPDATE game_sessions SET player2_id=? WHERE session_id=? AND player2_id IS NULL",
                [userId, sessionId]
            )

            broadcast(sessionId, { type:"joinedRoom", sessionId })

            const [players] = await pool.query(
                "SELECT player1_id,player2_id FROM game_sessions WHERE session_id=?",
                [sessionId]
            )
            broadcast(sessionId, { type:"players", players:players[0] })

            if (players[0].player1_id && players[0].player2_id) {

                const base = [
                    "약소국","무기","강대국","침묵",
                    "약소국","무인도","강대국","무기","강탈",
                    "약소국","강대국","무기","침묵","약소국",
                    "강대국","강탈","무기","무인도"
                ]

                for (let i = base.length - 1; i > 0; i--) {
                    const r = Math.floor(Math.random() * (i + 1))
                    const temp = base[i]
                    base[i] = base[r]
                    base[r] = temp
                }

                const tiles = ["출발", ...base, "출발"]

                await pool.query("DELETE FROM board_tiles WHERE session_id=?", [sessionId])

                for (let i = 0; i < tiles.length; i++) {
                    await pool.query(
                        "INSERT INTO board_tiles (session_id,index_pos,tile_type,value) VALUES (?,?,?,0)",
                        [sessionId, i, tiles[i]]
                    )
                }

                await pool.query("INSERT INTO player_states (session_id,user_id) VALUES (?,?)",[sessionId,players[0].player1_id])
                await pool.query("INSERT INTO player_states (session_id,user_id) VALUES (?,?)",[sessionId,players[0].player2_id])

                await pool.query("UPDATE game_sessions SET current_turn=? WHERE session_id=?",[players[0].player1_id,sessionId])
                broadcast(sessionId,{ type:"turnChange", nextTurn:players[0].player1_id })
            }
        }

        if (t === "rollDice") {
            const sessionId = ws.sessionId

            const [rows] = await pool.query(
                "SELECT player1_id,player2_id,current_turn FROM game_sessions WHERE session_id=?",
                [sessionId]
            )
            const session = rows[0]

            if (session.current_turn !== ws.user.user_id) {
                ws.send(JSON.stringify({ type:"notYourTurn" }))
                return
            }

            const dice = Math.floor(Math.random() * 6) + 1
            broadcast(sessionId,{ type:"dice", dice })

            const [meRows] = await pool.query(
                "SELECT * FROM player_states WHERE session_id=? AND user_id=?",
                [sessionId,ws.user.user_id]
            )
            const me = meRows[0]

            const newPos = (me.board_position + dice) % 20
            await pool.query("UPDATE player_states SET board_position=? WHERE state_id=?", [newPos,me.state_id])

            const [tileRows] = await pool.query(
                "SELECT tile_type,value FROM board_tiles WHERE session_id=? AND index_pos=?",
                [sessionId,newPos]
            )
            const tile = tileRows[0]

            broadcast(sessionId,{ type:"tileEvent", tile })

            let coinChange = 0

            if (tile.tile_type === "무기") {
                const [ran] = await pool.query("SELECT weapon_id FROM weapons ORDER BY RAND() LIMIT 1")
                const wid = ran[0].weapon_id
                await pool.query("INSERT INTO player_weapons (session_id,user_id,weapon_id) VALUES (?,?,?)",[sessionId,ws.user.user_id,wid])
                const [inv] = await pool.query(
                    "SELECT p.id,p.weapon_id,w.name,w.effect_type,w.value FROM player_weapons p JOIN weapons w ON p.weapon_id=w.weapon_id WHERE p.session_id=? AND p.user_id=?",
                    [sessionId,ws.user.user_id]
                )
                broadcast(sessionId,{ type:"weaponUpdate", inventory:inv })
            }

            if (tile.tile_type === "약소국" || tile.tile_type === "강대국") {
                const price = tile.tile_type === "약소국" ? 5 : 10
                const toll = tile.tile_type === "약소국" ? 2 : 5

                if (tile.value === 0) {
                    ws.send(JSON.stringify({ type:"buyOffer", price, index:newPos }))
                } else if (tile.value !== ws.user.user_id) {
                    coinChange -= toll
                    await pool.query("UPDATE player_states SET coin=coin+? WHERE session_id=? AND user_id=?",[toll,sessionId,tile.value])
                }
            }

            if (tile.tile_type === "무인도") {
                await pool.query("UPDATE player_states SET turn_skip_count=2 WHERE state_id=?", [me.state_id])
            }

            if (tile.tile_type === "침묵") {
                await pool.query("UPDATE player_states SET silence_count=2 WHERE state_id=?", [me.state_id])
            }

            if (coinChange !== 0) {
                await pool.query("UPDATE player_states SET coin=coin+? WHERE state_id=?", [coinChange,me.state_id])
            }

            const [states] = await pool.query(
                "SELECT user_id,board_position,coin,empire_hp,shield_count,turn_skip_count,silence_count FROM player_states WHERE session_id=?",
                [sessionId]
            )
            broadcast(sessionId,{ type:"stateUpdate", states })

            const nextTurn = session.current_turn === session.player1_id ? session.player2_id : session.player1_id
            await pool.query("UPDATE game_sessions SET current_turn=? WHERE session_id=?", [nextTurn,sessionId])
            broadcast(sessionId,{ type:"turnChange", nextTurn })
        }

        if (t === "buyLand") {
            const sessionId = ws.sessionId
            const userId = ws.user.user_id
            const index = msg.index
            const price = msg.price

            const [pRows] = await pool.query("SELECT state_id,coin FROM player_states WHERE session_id=? AND user_id=?", [sessionId,userId])
            const player = pRows[0]

            if (player.coin < price) return

            await pool.query("UPDATE board_tiles SET value=? WHERE session_id=? AND index_pos=?", [userId,sessionId,index])
            await pool.query("UPDATE player_states SET coin=coin-? WHERE state_id=?", [price,player.state_id])

            const [states] = await pool.query(
                "SELECT user_id,board_position,coin,empire_hp,shield_count FROM player_states WHERE session_id=?",
                [sessionId]
            )
            broadcast(sessionId,{ type:"landBought", userId,index })
            broadcast(sessionId,{ type:"stateUpdate", states })
        }

        if (t === "useWeapon") {
            const sessionId = ws.sessionId
            const userId = ws.user.user_id
            const wid = msg.weaponId

            const [has] = await pool.query(
                "SELECT id FROM player_weapons WHERE session_id=? AND user_id=? AND weapon_id=? LIMIT 1",
                [sessionId,userId,wid]
            )
            if (has.length === 0) return

            const delId = has[0].id

            const [wRows] = await pool.query("SELECT effect_type,value FROM weapons WHERE weapon_id=?", [wid])
            const weapon = wRows[0]

            const [meRows] = await pool.query(
                "SELECT * FROM player_states WHERE session_id=? AND user_id=?",
                [sessionId,userId]
            )
            const me = meRows[0]

            const [enemyRows] = await pool.query(
                "SELECT * FROM player_states WHERE session_id=? AND user_id<>?",
                [sessionId,userId]
            )
            const enemy = enemyRows[0]

            let damage = 0
            let shieldUsed = false

            if (weapon.effect_type === "shield") {
                await pool.query("UPDATE player_states SET shield_count=shield_count+1 WHERE state_id=?", [me.state_id])
            } else {
                if (weapon.effect_type === "sword") damage = 1
                if (weapon.effect_type === "bow") damage = 3
                if (weapon.effect_type === "bomb") damage = 5

                if (enemy.shield_count > 0) {
                    shieldUsed = true
                    await pool.query("UPDATE player_states SET shield_count=shield_count-1 WHERE state_id=?", [enemy.state_id])
                } else {
                    await pool.query("UPDATE player_states SET empire_hp=empire_hp-? WHERE state_id=?", [damage,enemy.state_id])
                }
            }

            await pool.query("DELETE FROM player_weapons WHERE id=?", [delId])

            const [states] = await pool.query(
                "SELECT user_id,board_position,coin,empire_hp,shield_count FROM player_states WHERE session_id=?",
                [sessionId]
            )
            broadcast(sessionId,{ type:"stateUpdate", states })
            broadcast(sessionId,{ type:"weaponUsed", userId,weaponId:wid,damage,shieldUsed })

            for (const p of states) {
                if (p.empire_hp <= 0) {
                    broadcast(sessionId,{ type:"gameEnd", winner:userId })
                }
            }

            const [inv] = await pool.query(
                "SELECT p.id,p.weapon_id,w.name,w.effect_type,w.value FROM player_weapons p JOIN weapons w ON p.weapon_id=w.weapon_id WHERE p.session_id=? AND p.user_id=?",
                [sessionId,userId]
            )
            broadcast(sessionId,{ type:"weaponUpdate", inventory:inv })
        }
    })
})

function broadcast(sessionId,payload){
    wss.clients.forEach((c)=>{
        if(c.readyState===WebSocket.OPEN && c.sessionId===sessionId){
            c.send(JSON.stringify(payload))
        }
    })
}

server.listen(3000,()=>console.log("server 3000"))
