using TMPro;
using UnityEngine;

public class RoomItemUI : MonoBehaviour
{
    public TMP_Text label;
    int sessionId;

    public void Setup(int id, int count)
    {
        sessionId = id;
        if (label != null)
            label.text = $"{id}번방 ({count}/2)";
    }

    public void OnClick()
    {
        if (sessionId <= 0)
        {
            Debug.LogError("잘못된 방 ID 클릭됨");
            return;
        }

        WSClient.Instance.JoinRoom(sessionId);
    }
}
