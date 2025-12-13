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

        ws.OnOpen += () => Debug.Log("서버 연결 성공");
        ws.OnError += (e) => Debug.LogError(e);
        ws.OnClose += (e) => Debug.Log("서버 연결 종료");

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

            case "roomDeleted":
                SessionId = null;
                break;

            case "gameStart":
                gameReadySent = false;
                PendingTurnPlayerId = -1;
                UnityMainThreadDispatcher.Enqueue(() =>
                {
                    if (LobbyUI.Instance != null)
                        LobbyUI.Instance.HideWaitingRoom();

                    SceneManager.LoadScene("dice");
                });
                break;

            case "gameInit":
                GameInfo.MyPlayerId = msg.playerId;
                Debug.Log("내 플레이어 ID = " + msg.playerId);
                break;

            case "turnStart":
                if (DiceManager.Instance != null)
                    DiceManager.Instance.OnTurnStart(msg.playerId);
                else
                    PendingTurnPlayerId = msg.playerId;
                break;

            case "diceResult":
                if (DiceManager.Instance != null)
                    DiceManager.Instance.OnDiceResult(msg.playerId, msg.dice);
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
}
