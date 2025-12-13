using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class PlayerController : MonoBehaviour
{
    public int currentIndex = 0;
    public float moveSpeed = 0.25f;

    public Image tokenImage;
    public Sprite[] tokenSprites;

    public System.Action<int, PlayerController> OnTileArrived;
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

        if (playerId == GameInfo.MyPlayerId)
        {
            Debug.Log($"[CLIENT] SendMoveEnd ▶ player:{playerId}, tile:{currentIndex}");
            WSClient.Instance.SendMoveEnd(currentIndex);
        }

        OnTileArrived?.Invoke(currentIndex, this);
    }


    public void ChangeToken(int index)
    {
        tokenImage.sprite = tokenSprites[index];
    }
}
