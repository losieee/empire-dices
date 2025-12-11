using UnityEngine;
using TMPro;

public class RoomWaitingUI : MonoBehaviour
{
    public static RoomWaitingUI Instance;

    public GameObject panel;
    public TMP_Text roomInfoText; // "방 번호: X" 같은 UI
    public TMP_Text playerCountText; // "1/2 플레이어 대기중..."

    void Awake()
    {
        Instance = this;
        panel.SetActive(false);
    }

    public void OpenWaitingRoom(string sessionId)
    {
        panel.SetActive(true);
        roomInfoText.text = $"방 번호: {sessionId}";
        playerCountText.text = "1/2 플레이어 대기중...";
    }

    public void CloseWaitingRoom()
    {
        panel.SetActive(false);
    }

    public void OnCancel()
    {
        WSClient.Instance.DeleteRoom();
        WSClient.Instance.ResetSession();

        LobbyUI.Instance.ShowRoomList();
        panel.SetActive(false);
    }

    




}
