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
        if (tiles == null || tiles.Count == 0) return;

        if (moveCoroutine != null)
            StopCoroutine(moveCoroutine);

        moveCoroutine = StartCoroutine(MoveRoutine(steps, tiles));
    }

    IEnumerator MoveRoutine(int steps, List<Transform> tiles)
    {
        for (int i = 0; i < steps; i++)
        {
            currentIndex = (currentIndex + 1) % tiles.Count;
            Transform t = tiles[currentIndex];
            if (t == null) yield break;

            Vector3 target = t.position;

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

        if (playerId == GameInfo.MyPlayerId)
        {
            TileData data = TileManager.Instance != null ? TileManager.Instance.GetTile(currentIndex) : null;

            if (data != null && data.tileType == "territory" && !data.isOwned)
            {
                if (DiceManager.Instance != null && DiceManager.Instance.purchaseUI != null)
                    DiceManager.Instance.purchaseUI.ShowForTile(currentIndex);
            }

            WSClient.Instance.SendMoveEnd(currentIndex);
        }
    }
}
