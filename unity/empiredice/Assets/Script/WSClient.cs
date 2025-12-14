using NativeWebSocket;
using Newtonsoft.Json;
using System;
using UnityEngine;
using UnityEngine.SceneManagement;

public class WSClient : MonoBehaviour
{
    public static WSClient Instance;

    WebSocket ws;
    [SerializeField] string serverUrl = "ws://127.0.0.1:3000";

    public bool IsConnected => ws != null && ws.State == WebSocketState.Open;

    public string SessionId;
    public string UserId;
    public bool gameReadySent = false;

    public int PendingTurnPlayerId = -1;
    public int PendingGameOverWinnerId = -1;

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else Destroy(gameObject);
    }

    void Update()
    {
#if !UNITY_WEBGL || UNITY_EDITOR
        ws?.DispatchMessageQueue();
#endif
    }

    public async void Connect()
    {
        if (IsConnected) return;

        ws = new WebSocket(serverUrl);

        ws.OnOpen += () => Debug.Log("[WS] connected");
        ws.OnError += (e) => Debug.LogError("[WS] error: " + e);
        ws.OnClose += (e) => Debug.Log("[WS] closed");

        ws.OnMessage += (bytes) =>
        {
            string json = System.Text.Encoding.UTF8.GetString(bytes);
            UnityMainThreadDispatcher.Enqueue(() => HandleMessage(json));
        };

        await ws.Connect();
    }

    void HandleMessage(string json)
    {
        Debug.Log("[서버 메세지] " + json);

        ServerMessage msg = JsonConvert.DeserializeObject<ServerMessage>(json);
        if (msg == null) return;

        switch (msg.type)
        {
            case "auth_ok":
                UserId = msg.userId;
                break;

            case "roomCreated":
                SessionId = msg.sessionId;
                LobbyUI.Instance.OpenWaitingRoom(SessionId);
                break;

            case "joinSuccess":
                SessionId = msg.sessionId;
                break;

            case "gameStart":
                gameReadySent = false;
                PendingTurnPlayerId = -1;
                PendingGameOverWinnerId = -1;
                GameInfo.CurrentTurnPlayerId = -1;

                if (LobbyUI.Instance != null)
                    LobbyUI.Instance.HideWaitingRoom();

                SceneManager.LoadScene("dice");
                break;

            case "gameInit":
                GameInfo.MyPlayerId = msg.playerId;

                if (DiceManager.Instance != null)
                {
                    if (PendingGameOverWinnerId != -1)
                    {
                        DiceManager.Instance.OnGameOver(PendingGameOverWinnerId);
                        PendingGameOverWinnerId = -1;
                    }
                    else if (GameInfo.CurrentTurnPlayerId != -1)
                    {
                        DiceManager.Instance.OnTurnStart(GameInfo.CurrentTurnPlayerId);
                    }
                }
                break;

            case "turnStart":
                GameInfo.CurrentTurnPlayerId = msg.playerId;
                PendingTurnPlayerId = msg.playerId;

                if (DiceManager.Instance != null)
                {
                    DiceManager.Instance.OnTurnStart(msg.playerId);
                    PendingTurnPlayerId = -1;
                }
                break;

            case "diceResult":
                DiceManager.Instance?.OnDiceResult(msg.playerId, msg.dice);
                break;

            case "weaponUpdate":
                DiceManager.Instance?.OnWeaponUpdate(msg.playerId, msg.weaponCount);
                break;

            case "hpUpdate":
                DiceManager.Instance?.OnHpUpdate(msg.playerId, msg.hp);
                break;

            case "battleResult":
                DiceManager.Instance?.ShowBattleWinner(msg.winnerId);
                break;

            case "gameOver":
                if (DiceManager.Instance != null)
                {
                    DiceManager.Instance.OnGameOver(msg.winnerId);
                }
                else
                {
                    PendingGameOverWinnerId = msg.winnerId;
                }
                break;

            case "territoryBought":
                if (TileManager.Instance != null)
                {
                    TileData data = TileManager.Instance.GetTile(msg.tileIndex);
                    if (data != null)
                    {
                        data.isOwned = true;
                        data.ownerId = msg.playerId;

                        var tc = TileManager.Instance.tiles[msg.tileIndex].GetComponent<TileController>();
                        if (tc != null) tc.UpdateAppearance();
                    }
                }
                break;
        }
    }

    public async void SendAuth(string token)
    {
        if (!IsConnected) return;
        await ws.SendText(JsonConvert.SerializeObject(new { type = "auth", token }));
    }

    public async void CreateRoom()
    {
        if (!IsConnected) return;
        await ws.SendText(JsonConvert.SerializeObject(new { type = "createRoom" }));
    }

    public async void JoinRoom(int sessionId)
    {
        if (!IsConnected) return;
        await ws.SendText(JsonConvert.SerializeObject(new { type = "joinRoom", sessionId }));
    }

    public async void SendGameReady()
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "gameReady",
            sessionId = SessionId
        }));
    }

    public async void SendRollDice()
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "rollDice",
            sessionId = SessionId,
            playerId = GameInfo.MyPlayerId
        }));
    }

    public async void SendMoveEnd(int tileIndex)
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "moveEnd",
            sessionId = SessionId,
            playerId = GameInfo.MyPlayerId,
            tileIndex
        }));
    }

    public async void SendBuyTerritory(int tileIndex)
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "buyTerritory",
            sessionId = SessionId,
            playerId = GameInfo.MyPlayerId,
            tileIndex = tileIndex
        }));
    }

    public async void DeleteRoom()
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "deleteRoom",
            sessionId = SessionId
        }));

        SessionId = null;
    }

    public void ResetSession()
    {
        SessionId = null;
    }
}

[Serializable]
public class ServerMessage
{
    public string type;
    public string sessionId;
    public string userId;
    public int playerId;
    public int dice;
    public int weaponCount;
    public int tileIndex;
    public int hp;
    public int winnerId;
}
