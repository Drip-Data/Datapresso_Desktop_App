import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger, // Import if the trigger is part of this component, otherwise pass isOpen prop
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface SavePresetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSavePreset: (name: string, description: string) => void;
}

const SavePresetModal: React.FC<SavePresetModalProps> = ({ isOpen, onOpenChange, onSavePreset }) => {
  const [presetName, setPresetName] = useState("");
  const [presetDescription, setPresetDescription] = useState("");

  const handleSave = () => {
    if (!presetName.trim()) {
      alert("请输入预设名称！"); // Simple validation
      return;
    }
    onSavePreset(presetName, presetDescription);
    // Optionally close modal after save, or let parent handle it via onOpenChange
    onOpenChange(false); 
    setPresetName(""); // Reset fields
    setPresetDescription("");
  };

  const formGroupClass = "mb-4";
  const formLabelClass = "block mb-1.5 text-sm font-medium text-text-primary-html";
  const formControlBaseClass = "w-full px-4 py-2.5 rounded-xl border-gray-300 bg-white text-[0.9375rem] text-text-primary-html placeholder:text-text-light-html focus:border-primary-dark focus:ring-2 focus:ring-primary-dark/30";


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* DialogTrigger would typically be outside this component, controlling its 'isOpen' state */}
      {/* <DialogTrigger asChild><Button>Open Modal</Button></DialogTrigger> */}
      <DialogContent className="sm:max-w-md"> {/* max-w-md is 448px, original was 600px. Use sm:max-w-lg or sm:max-w-xl for closer match */}
        <DialogHeader>
          {/* Original modal-title: font-size: 1.25rem; font-weight: 600; */}
          <DialogTitle className="text-xl">保存流程预设</DialogTitle>
          {/* No direct description in original, but can be added if needed */}
          {/* <DialogDescription>在这里为您的当前流程配置创建一个可复用的预设。</DialogDescription> */}
        </DialogHeader>
        
        <div className="py-4 space-y-4"> {/* Original modal-body padding: 1.5rem */}
          <div className={formGroupClass}>
            <Label htmlFor="preset-name" className={formLabelClass}>预设名称</Label>
            <Input 
              id="preset-name" 
              value={presetName} 
              onChange={(e) => setPresetName(e.target.value)} 
              placeholder="例如：高效代码生成流程"
              className={formControlBaseClass} 
            />
          </div>
          <div className={formGroupClass}>
            <Label htmlFor="preset-description" className={formLabelClass}>描述 (可选)</Label>
            <Textarea 
              id="preset-description" 
              value={presetDescription} 
              onChange={(e) => setPresetDescription(e.target.value)} 
              rows={3}
              className={`${formControlBaseClass} min-h-[80px]`}
            />
          </div>
        </div>

        {/* Original modal-footer: padding: 1.25rem 1.5rem; ... justify-content: flex-end; gap: 0.75rem; */}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">取消</Button>
          </DialogClose>
          <Button type="button" onClick={handleSave} className="bg-gradient-to-r from-primary-dark to-primary-light hover:opacity-90">保存预设</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SavePresetModal;