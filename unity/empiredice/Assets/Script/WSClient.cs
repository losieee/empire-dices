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

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
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
            HandleMessage(json);
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
                GameInfo.CurrentTurnPlayerId = -1;

                UnityMainThreadDispatcher.Enqueue(() =>
                {
                    if (LobbyUI.Instance != null)
                        LobbyUI.Instance.HideWaitingRoom();

                    SceneManager.LoadScene("dice");
                });
                break;

            case "gameInit":
                GameInfo.MyPlayerId = msg.playerId;
                Debug.Log("[WS] MyPlayerId=" + GameInfo.MyPlayerId);
                break;

            case "turnStart":
                GameInfo.CurrentTurnPlayerId = msg.playerId;
                PendingTurnPlayerId = msg.playerId;

                Debug.Log("[WS] turnStart received playerId=" + msg.playerId);

                if (DiceManager.Instance != null)
                {
                    DiceManager.Instance.OnTurnStart(msg.playerId);
                    PendingTurnPlayerId = -1;
                }
                else
                {
                    Debug.Log("[WS] DiceManager.Instance is NULL (buffering turnStart)");
                }
                break;

            case "diceResult":
                if (DiceManager.Instance != null)
                    DiceManager.Instance.OnDiceResult(msg.playerId, msg.dice);
                break;

            case "weaponUpdate":
                if (DiceManager.Instance != null)
                    DiceManager.Instance.OnWeaponUpdate(msg.playerId, msg.weaponCount);
                break;

            case "territoryBought":
                if (TileManager.Instance != null)
                {
                    TileData data = TileManager.Instance.GetTile(msg.tileIndex);
                    if (data != null)
                    {
                        data.isOwned = true;
                        data.ownerId = msg.playerId;

                        TileManager.Instance.tiles[msg.tileIndex]
                            .GetComponent<TileController>()
                            .UpdateAppearance();
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

        Debug.Log("[WS] SendGameReady");

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "gameReady",
            sessionId = SessionId
        }));
    }

    public async void SendRollDice()
    {
        if (!IsConnected) return;

        await ws.SendText(JsonConvert.SerializeObject(new
        {
            type = "rollDice",
            sessionId = SessionId,
            playerId = GameInfo.MyPlayerId
        }));
    }

    public async void SendMoveEnd(int tileIndex)
    {
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
}
