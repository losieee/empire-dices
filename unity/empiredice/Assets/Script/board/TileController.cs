using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TileController : MonoBehaviour
{
    public Image flagImage;
    public Image weaponCardImage;
    public TextMeshProUGUI gradeText;
    public TextMeshProUGUI specialText;
    public Image background;
    public TileData data;

    public Color player1Color = new Color32(255, 240, 120, 255); // gold
    public Color player2Color = new Color32(120, 180, 255, 255); // blue
    public Color defaultColor = Color.white;

    public void SetupTile(TileData data)
    {
        this.data = data;

        ResetLayout();

        flagImage.gameObject.SetActive(false);
        weaponCardImage.gameObject.SetActive(false);
        gradeText.gameObject.SetActive(false);
        specialText.gameObject.SetActive(false);

        switch (data.tileType)
        {
            case "territory":
                var flag = Resources.Load<Sprite>("Flags/" + data.flagCode);
                if (flag != null)
                {
                    flagImage.sprite = flag;
                    flagImage.gameObject.SetActive(true);
                }

                gradeText.text = data.grade;
                gradeText.fontSize = 36;
                gradeText.gameObject.SetActive(true);
                break;

            case "weapon":
                weaponCardImage.gameObject.SetActive(true);
                break;
        }

        UpdateAppearance();
    }

    public void UpdateAppearance()
    {
        if (data != null && data.isOwned)
        {
            if (data.ownerId == 1)
                background.color = player1Color;
            else if (data.ownerId == 2)
                background.color = player2Color;
            else
                background.color = defaultColor;
        }
        else
        {
            background.color = defaultColor;
        }
    }

    public void SetSpecialText(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            specialText.gameObject.SetActive(false);
            return;
        }

        flagImage.gameObject.SetActive(false);
        weaponCardImage.gameObject.SetActive(false);
        gradeText.gameObject.SetActive(false);

        specialText.text = text;
        specialText.fontSize = 56;
        specialText.gameObject.SetActive(true);
    }

    void ResetLayout()
    {
        RectTransform flag = flagImage.GetComponent<RectTransform>();
        flag.anchorMin = new Vector2(0.5f, 0.5f);
        flag.anchorMax = new Vector2(0.5f, 0.5f);
        flag.pivot = new Vector2(0.5f, 0.5f);
        flag.anchoredPosition = new Vector2(0, 25);

        RectTransform grade = gradeText.GetComponent<RectTransform>();
        grade.anchorMin = new Vector2(.5f, .5f);
        grade.anchorMax = new Vector2(.5f, .5f);
        grade.pivot = new Vector2(.5f, .5f);
        grade.sizeDelta = new Vector2(120, 40);
        grade.anchoredPosition = new Vector2(0, -40);

        RectTransform weapon = weaponCardImage.GetComponent<RectTransform>();
        weapon.anchorMin = new Vector2(.5f, .5f);
        weapon.anchorMax = new Vector2(.5f, .5f);
        weapon.sizeDelta = new Vector2(80, 80);
        weapon.anchoredPosition = Vector2.zero;

        RectTransform st = specialText.GetComponent<RectTransform>();
        st.anchorMin = Vector2.zero;
        st.anchorMax = Vector2.one;
        st.offsetMin = new Vector2(20, 20);
        st.offsetMax = new Vector2(-20, -20);
    }
}
