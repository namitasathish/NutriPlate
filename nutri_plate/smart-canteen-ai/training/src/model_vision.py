import torch
import torch.nn as nn
import timm

class VisionSpoilageNet(nn.Module):
    def __init__(self, backbone_name: str = "efficientnet_b0", pretrained: bool = True):
        super().__init__()
        self.backbone = timm.create_model(
            backbone_name, 
            pretrained=pretrained,  # Use the pretrained parameter here
            num_classes=0, 
            global_pool="avg"
        )
        in_features = self.backbone.num_features
        self.feat_head = nn.Sequential(
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True)
        )
        self.cls_head = nn.Linear(512, 1)

    def forward(self, x):
        x = self.backbone(x)          # [B, 1280]
        feats = self.feat_head(x)     # [B, 512]
        logits = self.cls_head(feats) # [B, 1]
        prob = torch.sigmoid(logits)  # [B, 1]
        return prob, feats
