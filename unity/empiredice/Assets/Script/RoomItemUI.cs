using TMPro;
using UnityEngine;

public class RoomItemUI : MonoBehaviour
{
    public TMP_Text label;
    int sessionId;

    public void Setup(int id, int count)
    {
        sessionId = id;
        label.text = $"{id}¹ø¹æ ({count}/2)";
    }

    public void OnClick()
    {
        WSClient.Instance.JoinRoom(sessionId);
    }
}
