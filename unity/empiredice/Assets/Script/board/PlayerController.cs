using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    public int currentIndex = 0;
    public float moveSpeed = 0.25f;
    public int playerId = 0;

    Coroutine moveCoroutine;

    public void Move(int steps, List<Transform> tiles)
    {
        if (moveCoroutine != null)
            StopCoroutine(moveCoroutine);

        moveCoroutine = StartCoroutine(MoveRoutine(steps, tiles));
    }

    IEnumerator MoveRoutine(int steps, List<Transform> tiles)
    {
        for (int i = 0; i < steps; i++)
        {
            currentIndex = (currentIndex + 1) % tiles.Count;
            Vector3 target = tiles[currentIndex].position;

            while (Vector3.Distance(transform.position, target) > 0.05f)
            {
                transform.position = Vector3.MoveTowards(
                    transform.position,
                    target,
                    moveSpeed * Time.deltaTime * 60f
                );
                yield return null;
            }

            yield return new WaitForSeconds(0.1f);
        }

        Debug.Log($"[ARRIVE] player {playerId} tile {currentIndex}");

        // 🔥 여기서만 moveEnd 보냄
        if (playerId == GameInfo.MyPlayerId)
        {
            TileData data = TileManager.Instance.GetTile(currentIndex);

            if (data.tileType == "territory" && !data.isOwned)
            {
                FindObjectOfType<TilePurchaseUI>()
                    ?.ShowForTile(currentIndex);
            }

            WSClient.Instance.SendMoveEnd(currentIndex);
        }
    }
}
