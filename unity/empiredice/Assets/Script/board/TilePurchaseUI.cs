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

        if (data == null || data.tileType != "territory")
        {
            Debug.Log("territory 아님 → UI 안 띄움");
            return;
        }

        panelRoot.SetActive(true);  // 변경된 부분
        titleText.text = "영토 구매";
        descText.text = $"{data.grade} 영토를 구매하시겠습니까?";
    }



    void OnClickBuy()
    {
        Debug.Log($"타일 {currentTileIndex} 구매");
        // TODO: 나중에 여기서 DB / 소유자 정보 처리

        gameObject.SetActive(false);
    }

    void OnClickSkip()
    {
        Debug.Log($"타일 {currentTileIndex} 구매 스킵");
        gameObject.SetActive(false);
    }
}
