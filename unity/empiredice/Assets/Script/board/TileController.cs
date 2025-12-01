using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TileController : MonoBehaviour
{
    public Image flagImage;          // 국기
    public Image weaponCardImage;    // 무기 카드 아이콘
    public TextMeshProUGUI gradeText;   // 강대국 / 약소국
    public TextMeshProUGUI specialText; // 출발 / 침묵 / 강탈 / 무인도

    public void SetupTile(TileData data)
    {
        ResetLayout();
        // 전부 끄고 시작
        flagImage.gameObject.SetActive(false);
        weaponCardImage.gameObject.SetActive(false);
        gradeText.gameObject.SetActive(false);
        specialText.gameObject.SetActive(false);

        switch (data.tileType)
        {
            case "territory":
                // 국기
                var flag = Resources.Load<Sprite>("Flags/" + data.flagCode);
                if (flag != null)
                {
                    flagImage.sprite = flag;
                    flagImage.gameObject.SetActive(true);
                }

                // 강 / 약 표시
                gradeText.text = data.grade;   // "강대국" 또는 "약소국"
                gradeText.fontSize = 36;       // 적당한 크기
                gradeText.gameObject.SetActive(true);
                break;

            case "weapon":
                // 무기 카드 아이콘만
                weaponCardImage.gameObject.SetActive(true);
                break;

            default:
                // start / island / silence / steal 은 여기서는 아무것도 안 함
                break;
        }
    }

    // 특수칸(출발/무인도/침묵/강탈)용
    public void SetSpecialText(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            specialText.gameObject.SetActive(false);
            return;
        }

        // 특수칸에서는 나머지 다 끔
        flagImage.gameObject.SetActive(false);
        weaponCardImage.gameObject.SetActive(false);
        gradeText.gameObject.SetActive(false);

        specialText.text = text;
        specialText.fontSize = 56;      // 큼직하게
        specialText.gameObject.SetActive(true);
    }
    void ResetLayout()
    {
        RectTransform flag = flagImage.GetComponent<RectTransform>();
        flag.anchorMin = new Vector2(0.5f, 0.5f);
        flag.anchorMax = new Vector2(0.5f, 0.5f);
        flag.pivot = new Vector2(0.5f, 0.5f);

        // 가로는 타일 폭 기준 90% / 세로는 비율 유지
        float tileWidth = ((RectTransform)transform).rect.width;
        //flag.sizeDelta = new Vector2(tileWidth * 0.90f, tileWidth * 0.55f);
        flag.anchoredPosition = new Vector2(0, 25);


        // GRADE
        RectTransform grade = gradeText.GetComponent<RectTransform>();
        grade.anchorMin = new Vector2(.5f, .5f);
        grade.anchorMax = new Vector2(.5f, .5f);
        grade.pivot = new Vector2(.5f, .5f);
        grade.sizeDelta = new Vector2(120, 40);
        grade.anchoredPosition = new Vector2(0, -40);

        // weapon
        RectTransform weapon = weaponCardImage.GetComponent<RectTransform>();
        weapon.anchorMin = new Vector2(.5f, .5f);
        weapon.anchorMax = new Vector2(.5f, .5f);
        weapon.sizeDelta = new Vector2(80, 80);
        weapon.anchoredPosition = Vector2.zero;

        // special
        RectTransform st = specialText.GetComponent<RectTransform>();
        st.anchorMin = Vector2.zero;
        st.anchorMax = Vector2.one;
        st.offsetMin = new Vector2(20, 20);
        st.offsetMax = new Vector2(-20, -20);
    }

}
