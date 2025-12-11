using NativeWebSocket;
using Newtonsoft.Json;
using System;
using UnityEngine;
using UnityEngine.SceneManagement;

public class WSClient : MonoBehaviour
{
    public static WSClient Instance;

    private WebSocket ws;
    [SerializeField] private string serverUrl = "ws://127.0.0.1:3000";

    public bool IsConnected => ws != null && ws.State == WebSocketState.Open;

    public string SessionId { get; private set; }
    public string UserId { get; private set; }

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

        ws.OnOpen += () => Debug.Log("서버 연결 성공!");
        ws.OnError += (e) => Debug.LogError("WebSocket Error: " + e);
        ws.OnClose += (e) => Debug.Log("서버 연결 종료");

        ws.OnMessage += (bytes) =>
        {
            string msg = System.Text.Encoding.UTF8.GetString(bytes);
            HandleMessage(msg);
        };

        await ws.Connect();
    }

    private void HandleMessage(string json)
    {
        Debug.Log("[서버 메세지] " + json);

        var msg = JsonConvert.DeserializeObject<ServerMessage>(json);
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
                Debug.Log("방 삭제 완료");
                break;

            case "gameStart":
                Debug.Log("게임 시작 메시지 수신됨");

                // 대기패널 닫기
                if (LobbyUI.Instance != null)
                    LobbyUI.Instance.HideWaitingRoom();

                UnityMainThreadDispatcher.Enqueue(() =>
                {
                    LobbyUI.Instance.HideWaitingRoom();   // ★ 씬 전환 전에 UI 제거
                    SceneManager.LoadScene("dice");
                });

                break;


            // 🔥 게임씬에서 플레이어 ID/턴 설정
            case "gameInit":
                GameInfo.MyPlayerId = msg.playerId;
                GameInfo.CurrentTurn = msg.turn;
                Debug.Log("게임 초기화: MyPlayer=" + msg.playerId);
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

    public async void DeleteRoom()
    {
        if (!IsConnected || string.IsNullOrEmpty(SessionId)) return;

        await ws.SendText(JsonConvert.SerializeObject(new { type = "deleteRoom", sessionId = SessionId }));
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
    public int turn;
}
