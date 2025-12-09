    using System;
    using UnityEngine;
    using NativeWebSocket;
    using Newtonsoft.Json;

    public class WSClient : MonoBehaviour
    {
        private static WSClient instance;
        public static WSClient Instance => instance;

        private WebSocket ws;
        [SerializeField] private string serverUrl = "ws://127.0.0.1:3000";

        public bool IsConnected => ws != null && ws.State == WebSocketState.Open;
        public string UserId { get; private set; }
        public string SessionId { get; private set; }

        private void Awake()
        {
            if (instance == null)
            {
                instance = this;
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
            if (IsConnected)
            {
                Debug.Log("이미 서버에 연결되어 있음");
                return;
            }

            Debug.Log("서버 접속 시도...");
            ws = new WebSocket(serverUrl);

            ws.OnOpen += () =>
            {
                Debug.Log("서버 연결 성공!");
            };

            ws.OnError += (e) =>
            {
                Debug.LogError($"WebSocket Error: {e}");
            };

            ws.OnClose += (e) =>
            {
                Debug.Log("서버 연결 종료");
            };

            ws.OnMessage += (bytes) =>
            {
                string msg = System.Text.Encoding.UTF8.GetString(bytes);
                Debug.Log($"[서버 메세지] {msg}");
                HandleMessage(msg);
            };

            await ws.Connect();
        }

        private void HandleMessage(string json)
        {
            try
            {
                var msg = JsonConvert.DeserializeObject<ServerMessage>(json);

                switch (msg.type)
                {
                    case "auth_ok":
                        UserId = msg.userId;
                        Debug.Log($"인증 성공: {msg.userId}");
                        break;

                    case "auth_fail":
                        Debug.Log("인증 실패");
                        break;

                    case "roomCreated":
                        SessionId = msg.sessionId;
                        Debug.Log($"방 생성 완료: {msg.sessionId}");
                        break;

                    case "joinedRoom":
                        Debug.Log($"방 참여 완료: {msg.sessionId}");
                        break;

                    case "dice":
                        Debug.Log($"주사위 값: {msg.dice}");
                        break;

                    case "tileEvent":
                        Debug.Log($"타일 이벤트: {msg.tile?.tile_type}");
                        break;

                    case "stateUpdate":
                        Debug.Log("상태 업데이트 수신");
                        break;

                    case "turnChange":
                        Debug.Log($"턴 변경 → {msg.nextTurn}");
                        break;

                    case "landBought":
                        Debug.Log($"{msg.userId}가 {msg.index}번 땅 구매");
                        break;

                    case "weaponUsed":
                        Debug.Log($"무기 사용: {msg.weaponId} / 데미지:{msg.damage}");
                        break;

                    case "gameEnd":
                        Debug.Log($"게임 종료 → 승자:{msg.winner}");
                        break;

                    default:
                        Debug.Log($"알 수 없는 메시지: {msg.type}");
                        break;
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"메시지 파싱 실패: {e.Message}\n{json}");
            }
        }

        public async void SendAuth(string token)
        {
            if (!IsConnected) return;
            var msg = new { type = "auth", token };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        public async void CreateRoom()
        {
            if (!IsConnected) return;
            var msg = new { type = "createRoom" };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        public async void JoinRoom(string id)
        {
            if (!IsConnected) return;
            var msg = new { type = "joinRoom", sessionId = id };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        public async void RollDice()
        {
            if (!IsConnected) return;
            var msg = new { type = "rollDice" };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        public async void BuyLand(int price, int index)
        {
            if (!IsConnected) return;
            var msg = new { type = "buyLand", price, index };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        public async void UseWeapon(int weaponId)
        {
            if (!IsConnected) return;
            var msg = new { type = "useWeapon", weaponId };
            await ws.SendText(JsonConvert.SerializeObject(msg));
        }

        private async void OnApplicationQuit()
        {
            if (ws != null && ws.State == WebSocketState.Open)
                await ws.Close();
        }
    }

    [Serializable]
    public class ServerMessage
    {
        public string type;
        public string userId;
        public string sessionId;
        public int dice;
        public int nextTurn;
        public int weaponId;
        public int damage;
        public int index;
        public string winner;   
        public TileInfo tile;
    }

    [Serializable]
    public class TileInfo
    {
        public string tile_type;
        public int value;
    }
