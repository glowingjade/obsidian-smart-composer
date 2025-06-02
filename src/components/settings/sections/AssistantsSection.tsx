// TargetFile: /Users/shizhiyun/Documents/textrepo/.obsidian/plugins/obsidian-smart-composer/src/components/settings/sections/AssistantsSection.tsx
// CodeMarkdownLanguage: typescript
// Instruction: 修正 AssistantsSection.tsx 中的 lint 错误，特别是 ObsidianButton 的用法和 ConfirmModal 的调用。
// ReplacementContent:
import { App } from 'obsidian';
import { Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useSettings } from '../../../contexts/settings-context';
import { Assistant } from '../../../types/assistant.types';
import { ObsidianButton } from '../../common/ObsidianButton';
import { ObsidianSetting } from '../../common/ObsidianSetting';
import { ObsidianTextArea } from '../../common/ObsidianTextArea';
import { ObsidianTextInput } from '../../common/ObsidianTextInput';
import { ObsidianToggle } from '../../common/ObsidianToggle';
import { ConfirmModal } from '../../../settings/ConfirmModal';

type AssistantItemProps = {
  assistant: Assistant;
  onUpdate: (updatedAssistant: Assistant) => void;
  onDelete: (id: string) => void;
  isDefault: boolean;
  onSetDefault: (id: string) => void;
};

function AssistantItem({
  assistant,
  onUpdate,
  onDelete,
  isDefault,
  onSetDefault,
}: AssistantItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent click from bubbling to the header
    onDelete(assistant.id);
  };

  return (
    <div className="smtcmp-assistant-item">
      <div
        className="smtcmp-assistant-header"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded);
        }}
        aria-expanded={isExpanded}
        aria-controls={`assistant-details-${assistant.id}`}
      >
        <ObsidianSetting
          name={assistant.name}
          desc={assistant.description || '无描述'}
          className="smtcmp-assistant-item-setting"
        >
          <div className="smtcmp-assistant-actions">
            <ObsidianToggle
              value={isDefault}
              onChange={() => onSetDefault(assistant.id)}
            />
            <span style={{ marginLeft: '4px', fontSize: '12px' }}>默认</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <ObsidianButton
                aria-label={`删除助手 ${assistant.name}`}
                onClick={() => handleDeleteClick(new MouseEvent('click') as unknown as React.MouseEvent)}
                text=""
              />
              <Trash2 size={16} style={{ marginLeft: '4px' }} />
            </span>
          </div>
        </ObsidianSetting>
      </div>

      {isExpanded && (
        <div className="smtcmp-assistant-details" id={`assistant-details-${assistant.id}`}>
          <ObsidianSetting name="名称" desc="助手的名称">
            <ObsidianTextInput
              value={assistant.name}
              onChange={(value) => onUpdate({ ...assistant, name: value })}
            />
          </ObsidianSetting>

          <ObsidianSetting name="描述" desc="助手的简短描述">
            <ObsidianTextInput
              value={assistant.description || ''}
              onChange={(value) =>
                onUpdate({ ...assistant, description: value })
              }
            />
          </ObsidianSetting>

          <ObsidianSetting
            name="系统提示词"
            desc="定义助手的行为和能力的系统提示词"
            className="smtcmp-settings-textarea-header"
          />
          <ObsidianTextArea
            value={assistant.systemPrompt}
            onChange={(value) =>
              onUpdate({ ...assistant, systemPrompt: value })
            }
            placeholder="输入系统提示词..."
          />
        </div>
      )}
    </div>
  );
}

interface AssistantsSectionProps {
  app: App;
}

export function AssistantsSection({ app }: AssistantsSectionProps) {
  const { settings, setSettings } = useSettings();
  const assistants = settings.assistants || [];

  const handleAddAssistant = async () => {
    const newAssistant: Assistant = {
      id: uuidv4(),
      name: `新助手 ${assistants.length + 1}`,
      description: '',
      systemPrompt: '',
      isDefault: assistants.length === 0,
    };

    let newAssistantsList = [...assistants, newAssistant];
    let newCurrentAssistantId = settings.currentAssistantId;

    if (newAssistant.isDefault) {
      newCurrentAssistantId = newAssistant.id;
      newAssistantsList = newAssistantsList.map(a => 
        a.id === newAssistant.id ? newAssistant : { ...a, isDefault: false }
      );
    }

    await setSettings({
      ...settings,
      assistants: newAssistantsList,
      currentAssistantId: newCurrentAssistantId,
    });
  };

  const handleUpdateAssistant = async (updatedAssistant: Assistant) => {
    let newAssistantsList = assistants.map((assistant: Assistant) => // Explicit type
      assistant.id === updatedAssistant.id ? updatedAssistant : assistant
    );
    if (updatedAssistant.isDefault) {
        newAssistantsList = newAssistantsList.map((a: Assistant) => // Explicit type
            a.id === updatedAssistant.id ? a : {...a, isDefault: false}
        );
    }
    await setSettings({
      ...settings,
      assistants: newAssistantsList,
    });
  };

  const handleDeleteAssistant = async (id: string) => {
    const assistantToDelete = assistants.find((a) => a.id === id);
    if (!assistantToDelete) return;

    // 使用变量跟踪确认状态
    let confirmed = false;
    
    // 创建确认对话框
    const modal = new ConfirmModal(
      app,
      {
        title: `确认删除助手`,
        message: `你确定要删除助手 "${assistantToDelete.name}" 吗？此操作无法撤销。`,
        ctaText: '删除',
        onConfirm: () => {
          confirmed = true;
        }
      }
    );
    
    modal.onClose = async () => {
      if (confirmed) {
        let updatedAssistants = assistants.filter((a) => a.id !== id);
        let newCurrentAssistantId = settings.currentAssistantId;

        if (id === settings.currentAssistantId) {
          newCurrentAssistantId = updatedAssistants.length > 0 ? updatedAssistants[0]?.id : undefined;
        }

        if (updatedAssistants.length > 0 && !updatedAssistants.some(a => a.isDefault)) {
          updatedAssistants[0] = { ...updatedAssistants[0], isDefault: true };
          if (id === settings.currentAssistantId || !newCurrentAssistantId) {
             newCurrentAssistantId = updatedAssistants[0].id;
          }
        } else if (updatedAssistants.length === 0) {
          newCurrentAssistantId = undefined;
        }
        
        let defaultFound = false;
        updatedAssistants = updatedAssistants.map((a: Assistant) => { // Explicit type
            if (a.isDefault) {
                if (defaultFound) return {...a, isDefault: false};
                defaultFound = true;
            }
            return a;
        });
        if (!defaultFound && updatedAssistants.length > 0) {
            updatedAssistants[0] = {...updatedAssistants[0], isDefault: true};
            if (!newCurrentAssistantId) newCurrentAssistantId = updatedAssistants[0].id;
        }

        await setSettings({
          ...settings,
          assistants: updatedAssistants,
          currentAssistantId: newCurrentAssistantId,
        });
      }
    };
    // 回调已在创建时设置
    modal.open();
  };

  const handleSetDefault = async (id: string) => {
    await setSettings({
      ...settings,
      assistants: assistants.map((assistant: Assistant) => ({ // Explicit type
        ...assistant,
        isDefault: assistant.id === id,
      })),
      currentAssistantId: id, 
    });
  };

  return (
    <div className="smtcmp-settings-section">
      <h2 className="smtcmp-settings-header">自定义助手</h2>
      <ObsidianSetting
        name="添加助手"
        desc="创建自定义助手，预设不同的系统提示词。"
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ObsidianButton
            onClick={handleAddAssistant}
            aria-label="添加新助手"
            text="添加助手"
          />
          <Plus size={18} style={{ marginLeft: '8px' }} />
        </div>
      </ObsidianSetting>

      {assistants.length === 0 ? (
        <div className="smtcmp-no-assistants">
          <p>暂无自定义助手。点击“添加助手”按钮来创建你的第一个助手。</p>
        </div>
      ) : (
        <div className="smtcmp-assistants-list">
          {assistants.map((assistant: Assistant) => ( // Explicit type
            <AssistantItem
              key={assistant.id}
              assistant={assistant}
              onUpdate={handleUpdateAssistant}
              onDelete={handleDeleteAssistant}
              isDefault={assistant.isDefault || false}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}
    </div>
  );
}