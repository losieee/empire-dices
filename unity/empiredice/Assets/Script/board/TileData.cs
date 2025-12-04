    using UnityEngine;

public class TileData
{
    public string tileType;
    public string grade;
    public string flagCode;

    // 추가
    public bool isOwned = false;
    public int ownerId = -1; // -1 = 주인 없음
}
