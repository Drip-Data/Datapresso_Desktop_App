import os
import torch
import argparse

def merge_all_checkpoints(base_dir: str, prefix="grads", normalize_data=False):
    """
    自动合并所有 checkpoint 中各个投影维度下所有 rank 的梯度结果。

    Args:
        base_dir (str): such as: grads/llama3-1b
        prefix (str): file prefix "grads"
        normalize_data (bool): whether to normalize the data before merging
    """
    checkpoints = [
        ckpt for ckpt in os.listdir(base_dir)
        if os.path.isdir(os.path.join(base_dir, ckpt))
    ]

    for checkpoint in checkpoints:
        checkpoint_dir = os.path.join(base_dir, checkpoint)

        dim_dirs = [
            d for d in os.listdir(checkpoint_dir)
            if d.startswith("dim") and os.path.isdir(os.path.join(checkpoint_dir, d))
        ]

        for dim_dir in dim_dirs:
            dim_path = os.path.join(checkpoint_dir, dim_dir)
            dim = int(dim_dir.replace("dim", ""))

            rank_dirs = [
                os.path.join(dim_path, r) for r in os.listdir(dim_path)
                if r.startswith("rank") and os.path.isdir(os.path.join(dim_path, r))
            ]

            merged = []
            for rank_dir in rank_dirs:
                tensor_path = os.path.join(rank_dir, f"{prefix}_all_unormalized.pt")
                if not os.path.exists(tensor_path):
                    tensor_path = os.path.join(rank_dir, "all_unormalized.pt")
                if not os.path.exists(tensor_path):
                    print(f"Warning: {tensor_path} not found. Skipping.")
                    continue
                tensor = torch.load(tensor_path)
                if normalize_data:
                    tensor = torch.nn.functional.normalize(tensor, dim=1)
                merged.append(tensor)

            if merged:
                merged = torch.cat(merged, dim=0)
                out_file = os.path.join(dim_path, f"{prefix}_all_ranks.pt")
                torch.save(merged, out_file)
                print(f"[✓] Saved merged tensor (shape: {merged.shape}) to: {out_file}")
            else:
                print(f"[!] No valid gradients found in {dim_path}")


if __name__ == "__main__":

    parser = argparse.ArgumentParser()
    parser.add_argument("--grad_path", type=str, default="")
    args = parser.parse_args()

    merge_all_checkpoints(args.grad_path, 'grads', True)