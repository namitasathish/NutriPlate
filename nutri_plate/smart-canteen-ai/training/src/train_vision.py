import os
import torch
import torch.nn as nn
from torch.optim import AdamW
from tqdm import tqdm

from src.dataset_vision import get_dataloaders
from src.model_vision import VisionSpoilageNet
from src.utils import compute_f1, save_checkpoint


DATA_ROOT = "data/dataset"        # your 8-class folder
CKPT_PATH = "models/vision_efficientnet.pt"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
EPOCHS = 20
BATCH_SIZE = 16
LR = 1e-4
PATIENCE = 5  # Number of epochs to wait before early stopping

os.makedirs("models", exist_ok=True)

def train_one_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss = 0.0
    for imgs, labels in tqdm(loader, desc="Train", leave=False):
        imgs = imgs.to(DEVICE)
        labels = labels.view(-1, 1).to(DEVICE)

        optimizer.zero_grad()
        probs, feats = model(imgs)
        loss = criterion(probs, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * imgs.size(0)
    return total_loss / len(loader.dataset)

def eval_epoch(model, loader, criterion):
    model.eval()
    total_loss = 0.0
    all_probs = []
    all_labels = []
    with torch.no_grad():
        for imgs, labels in tqdm(loader, desc="Val", leave=False):
            imgs = imgs.to(DEVICE)
            labels = labels.view(-1, 1).to(DEVICE)

            probs, feats = model(imgs)
            loss = criterion(probs, labels)
            total_loss += loss.item() * imgs.size(0)

            all_probs.extend(probs.cpu().numpy().ravel().tolist())
            all_labels.extend(labels.cpu().numpy().ravel().tolist())

    f1 = compute_f1(all_labels, all_probs, threshold=0.5)
    return total_loss / len(loader.dataset), f1

def main():
    train_loader, val_loader, test_loader = get_dataloaders(DATA_ROOT, batch_size=BATCH_SIZE)

    model = VisionSpoilageNet().to(DEVICE)
    criterion = nn.BCELoss()
    optimizer = AdamW(model.parameters(), lr=LR)

    best_f1 = 0.0
    epochs_no_improve = 0  # Counter for epochs without improvement
    for epoch in range(1, EPOCHS + 1):
        print(f"\nEpoch {epoch}/{EPOCHS}")
        train_loss = train_one_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_f1 = eval_epoch(model, val_loader, criterion)
        print(f"Train loss: {train_loss:.4f} | Val loss: {val_loss:.4f} | Val F1: {val_f1:.4f}")

        if val_f1 > best_f1:
            best_f1 = val_f1
            save_checkpoint(model, CKPT_PATH)
            print(f"Saved best model with F1={best_f1:.4f}")
            epochs_no_improve = 0  # Reset counter when there's an improvement
        else:
            epochs_no_improve += 1
            print(f'No improvement in F1 for {epochs_no_improve} epochs')
            
            # Early stopping
            if epochs_no_improve >= PATIENCE:
                print(f'\nEarly stopping triggered after {PATIENCE} epochs without improvement')
                break

    print(f"\nTraining stopped after {epoch} epochs. Best Val F1: {best_f1:.4f}")

    # final test evaluation
    model.load_state_dict(torch.load(CKPT_PATH, map_location=DEVICE))
    model.to(DEVICE)
    test_loss, test_f1 = eval_epoch(model, test_loader, criterion)
    print(f"Test loss: {test_loss:.4f} | Test F1: {test_f1:.4f}")

if __name__ == "__main__":
    main()
