import os
from glob import glob
from typing import Tuple
import cv2
import torch
from torch.utils.data import Dataset, DataLoader
import albumentations as A
from albumentations.pytorch import ToTensorV2

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

def get_transforms(train: bool = True):
    if train:
        return A.Compose([
            A.Resize(256, 256),
            A.CenterCrop(224, 224),
            A.HorizontalFlip(p=0.5),
            A.RandomBrightnessContrast(p=0.5),
            A.MotionBlur(blur_limit=3, p=0.2),
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2()
        ])
    else:
        return A.Compose([
            A.Resize(256, 256),
            A.CenterCrop(224, 224),
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2()
        ])

class FoodQualityDataset(Dataset):
    def __init__(self, root_dir: str, paths, labels, transform=None):
        self.root_dir = root_dir
        self.paths = paths
        self.labels = labels
        self.transform = transform

    def __len__(self):
        return len(self.paths)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor]:
        img_path = self.paths[idx]
        label = self.labels[idx]
        img = cv2.imread(img_path)
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        if self.transform:
            img = self.transform(image=img)["image"]

        return img, torch.tensor(label, dtype=torch.float32)

def build_splits(root_dir: str, val_ratio: float = 0.15, test_ratio: float = 0.15):
    all_paths = []
    all_labels = []

    for cls in os.listdir(root_dir):
        cls_dir = os.path.join(root_dir, cls)
        if not os.path.isdir(cls_dir):
            continue
        files = glob(os.path.join(cls_dir, "*.jpg")) + glob(os.path.join(cls_dir, "*.png"))
        if cls.startswith("fresh_"):
            label = 0
        elif cls.startswith("spoiled_") or cls.startswith("spoilt_"):
            label = 1
        else:
            continue
        all_paths.extend(files)
        all_labels.extend([label] * len(files))

    all_paths = list(all_paths)
    all_labels = list(all_labels)

    from sklearn.model_selection import train_test_split
    X_train, X_tmp, y_train, y_tmp = train_test_split(
        all_paths, all_labels, test_size=(val_ratio + test_ratio),
        stratify=all_labels, random_state=42
    )
    rel_test = test_ratio / (val_ratio + test_ratio)
    X_val, X_test, y_val, y_test = train_test_split(
        X_tmp, y_tmp, test_size=rel_test,
        stratify=y_tmp, random_state=42
    )

    return (X_train, y_train), (X_val, y_val), (X_test, y_test)

def get_dataloaders(root_dir: str, batch_size: int = 16, num_workers: int = 2):
    (tr_p, tr_y), (val_p, val_y), (te_p, te_y) = build_splits(root_dir)

    train_ds = FoodQualityDataset(root_dir, tr_p, tr_y, transform=get_transforms(True))
    val_ds = FoodQualityDataset(root_dir, val_p, val_y, transform=get_transforms(False))
    test_ds = FoodQualityDataset(root_dir, te_p, te_y, transform=get_transforms(False))

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True,
                              num_workers=num_workers, pin_memory=True)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False,
                            num_workers=num_workers, pin_memory=True)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False,
                             num_workers=num_workers, pin_memory=True)
    return train_loader, val_loader, test_loader
