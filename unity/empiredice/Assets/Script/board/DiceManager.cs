using TMPro;
using UnityEngine;

public class DiceManager : MonoBehaviour
{
    public TextMeshProUGUI diceText;
    public TileManager tileManager;
    public PlayerController[] players; // 플레이어 배열
    public TilePurchaseUI purchaseUI;

    int currentPlayerIndex = 0;

    void Start()
    {
        // 1) MainLobby에서 넘어온 UI 모두 제거
        var ui = GameObject.FindObjectOfType<LobbyUI>();
        if (ui != null)
            ui.gameObject.SetActive(false);

        // 2) 서버에 준비 완료 전송
        WSClient.Instance.SendGameReady();

        // 3) playerId 셋팅
        players[0].playerId = 1;
        players[1].playerId = 2;

        Debug.Log("내 플레이어 ID = " + GameInfo.MyPlayerId);
    }




    void HandleArrival(int index, PlayerController player)
    {
        Debug.Log("도착한 플레이어: " + player.playerId);

        purchaseUI.player = player;     
        purchaseUI.ShowForTile(index);
    }

    public void RollDice()
    {
        var player = players[currentPlayerIndex]; // 현재 턴 플레이어

        int dice = Random.Range(1, 7);
        diceText.text = dice.ToString();
        StartCoroutine(player.Move(dice, tileManager.tiles));

        currentPlayerIndex = (currentPlayerIndex + 1) % players.Length; // 턴 변경
    }
}