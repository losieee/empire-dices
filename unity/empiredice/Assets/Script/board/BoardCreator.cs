using UnityEngine;

public class BoardCreator : MonoBehaviour
{
    public GameObject tilePrefab;
    public RectTransform boardParent;

    public int columns = 6;
    public int rows = 6;
    public float spacing = 12f;

    void Start()
    {
        GenerateBoard();
    }

    void GenerateBoard()
    {
        float boardWidth = boardParent.rect.width;
        float boardHeight = boardParent.rect.height;

        float cellSizeX = (boardWidth - spacing * (columns - 1)) / columns;
        float cellSizeY = (boardHeight - spacing * (rows - 1)) / rows;

        float totalWidth = (columns * cellSizeX) + ((columns - 1) * spacing);
        float totalHeight = (rows * cellSizeY) + ((rows - 1) * spacing);

        float startX = -(totalWidth / 2f) + cellSizeX / 2f;
        float startY = (totalHeight / 2f) - cellSizeY / 2f;

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < columns; c++)
            {
                if (r == 0 || r == rows - 1 || c == 0 || c == columns - 1)
                {
                    GameObject tile = Instantiate(tilePrefab, boardParent, false);
                    RectTransform rt = tile.GetComponent<RectTransform>();

                    rt.sizeDelta = new Vector2(cellSizeX, cellSizeY);

                    float x = startX + c * (cellSizeX + spacing);
                    float y = startY - r * (cellSizeY + spacing);

                    rt.anchoredPosition = new Vector2(x, y);
                }
            }
        }
    }
}
