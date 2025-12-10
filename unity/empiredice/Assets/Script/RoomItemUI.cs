using UnityEngine;
using TMPro;
using UnityEngine.UI;

public class RoomItemUI : MonoBehaviour
{
    public TMP_Text roomNameText;
    private int id;

    public void Setup(int roomId)
    {
        id = roomId;
        roomNameText.text = $"{roomId}¹ø ¹æ (1/2)";
        GetComponent<Button>().onClick.AddListener(() =>
        {
            WSClient.Instance.JoinRoom(id);
        });
    }
}
