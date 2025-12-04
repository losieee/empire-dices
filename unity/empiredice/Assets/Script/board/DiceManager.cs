using TMPro;
using UnityEngine;

public class DiceManager : MonoBehaviour
{
    public TextMeshProUGUI diceText;
    public TileManager tileManager;
    public PlayerController[] players; // 플레이어 배열
    public TilePurchaseUI purchaseUI;

    int currentPlayerIndex = 0;

    private void Start()
    {
        purchaseUI.gameObject.SetActive(false);
        foreach (var p in players)
            p.OnTileArrived += HandleArrival;
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