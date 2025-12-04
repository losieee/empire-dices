using UnityEngine;
using UnityEngine.UI;
using TMPro;

public class TilePurchaseUI : MonoBehaviour
{
    [Header("Text")]
    public TextMeshProUGUI titleText;
    public TextMeshProUGUI descText;

    [Header("Buttons")]
    public Button buyButton;
    public Button skipButton;

    [Header("Refs")]
    public TileManager tileManager;
    public PlayerController player;
    public GameObject panelRoot;

    int currentTileIndex;

    void Awake()
    {
        

        buyButton.onClick.AddListener(OnClickBuy);
        skipButton.onClick.AddListener(OnClickSkip);
    }


    public void ShowForTile(int tileIndex)
    {
        Debug.Log("TilePurchaseUI 호출됨: " + tileIndex);

        currentTileIndex = tileIndex;
        TileData data = tileManager.GetTile(tileIndex);

        // territory가 아니거나 이미 소유된 경우
        if (data == null || data.tileType != "territory" || data.isOwned)
        {
            Debug.Log("territory 아님 또는 이미 구매됨 → UI 안 띄움");
            return;
        }

        gameObject.SetActive(true);
        titleText.text = "영토 구매";
        descText.text = $"{data.grade} 영토를 구매하시겠습니까?";
    }



    void OnClickBuy()
    {
        TileData data = tileManager.GetTile(currentTileIndex);

        // 현재 턴의 플레이어 ID 적용
        data.isOwned = true;
        data.ownerId = player.playerId;

        tileManager.tiles[currentTileIndex]
            .GetComponent<TileController>()
            .UpdateAppearance();

        gameObject.SetActive(false);
    }


    void OnClickSkip()
    {
        Debug.Log($"타일 {currentTileIndex} 구매 스킵");
        gameObject.SetActive(false);
    }
}
