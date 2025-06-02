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
  // 使用状态跟踪展开状态
  const [isExpanded, setIsExpanded] = useState(false);

  // 处理删除点击
  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // 防止点击事件冒泡到头部
    onDelete(assistant.id);
  };
  
  // 处理设置为默认助手
  const handleSetAsDefault = (event: React.MouseEvent) => {
    event.stopPropagation(); // 防止点击事件冒泡到头部
    if (!isDefault) { // 只在非默认状态时允许设置为默认
      onSetDefault(assistant.id);
    }
  };

  // 处理展开/折叠
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="smtcmp-assistant-item" style={{
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '8px',
      margin: '12px 0',
      overflow: 'hidden',
      backgroundColor: isDefault ? 'var(--background-secondary-alt)' : 'var(--background-secondary)',
      transition: 'all 0.2s ease'
    }}>
      <div
        className="smtcmp-assistant-header"
        onClick={handleToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleToggleExpand();
        }}
        aria-expanded={isExpanded}
        aria-controls={`assistant-details-${assistant.id}`}
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid var(--background-modifier-border)' : 'none'
        }}
      >
        <div className="smtcmp-assistant-header-info" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{
              fontWeight: 'bold',
              fontSize: '16px'
            }}>{assistant.name}</span>
            
            {isDefault && (
              <span className="smtcmp-default-badge" style={{ 
                fontSize: '12px', 
                backgroundColor: 'var(--interactive-accent)', 
                color: 'var(--text-on-accent)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                默认
              </span>
            )}
          </div>
          

        </div>
        
        <div className="smtcmp-assistant-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {!isDefault && (
            <button
              className="smtcmp-set-default-btn"
              aria-label={`设置 ${assistant.name} 为默认助手`}
              onClick={handleSetAsDefault}
              style={{ 
                fontSize: '13px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                color: 'var(--interactive-accent)',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--interactive-accent-hover)';
                e.currentTarget.style.color = 'var(--text-on-accent)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--interactive-accent)';
              }}
            >
              设为默认
            </button>
          )}
          
          <button 
            className="smtcmp-delete-assistant-btn" 
            aria-label={`删除助手 ${assistant.name}`}
            onClick={handleDeleteClick}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background-modifier-error)';
              e.currentTarget.style.color = 'var(--text-error)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <Trash2 size={16} />
          </button>
          
          <span style={{
            transform: `rotate(${isExpanded ? '180deg' : '0deg'})`,
            transition: 'transform 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px'
          }}>
            ▼
          </span>
        </div>
      </div>

      {isExpanded && (
        <div 
          className="smtcmp-assistant-details"
          id={`assistant-details-${assistant.id}`}
          style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--background-primary-alt)',
            borderRadius: '0 0 8px 8px'
          }}
        >
          <div className="smtcmp-assistant-field" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <label style={{
              fontWeight: 'bold',
              fontSize: '14px'
            }}>名称</label>
            <ObsidianTextInput
              value={assistant.name}
              onChange={(value) => onUpdate({ ...assistant, name: value })}
              placeholder="输入助手名称"
            />
          </div>



          <ObsidianSetting
            name="系统提示词"
            desc="这个提示词将会添加到每次对话的开头。"
            className="smtcmp-settings-textarea-header"
          />
          
          <ObsidianSetting className="smtcmp-settings-textarea">
            <ObsidianTextArea
              value={assistant.systemPrompt || ''}
              onChange={(value) => onUpdate({ ...assistant, systemPrompt: value })}
              placeholder="输入系统提示词，定义助手的行为和能力"
            />
          </ObsidianSetting>
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
        // 先过滤掉要删除的助手
        const updatedAssistants = assistants.filter((a) => a.id !== id);
        
        // 确定新的当前助手ID
        let newCurrentAssistantId = settings.currentAssistantId;
        if (id === settings.currentAssistantId) {
          // 如果删除的是当前选中的助手，则选择第一个可用的助手
          newCurrentAssistantId = updatedAssistants.length > 0 ? updatedAssistants[0].id : undefined;
        }
        
        // 处理默认助手逻辑
        let finalAssistants = [...updatedAssistants];
        
        // 检查是否还有默认助手
        const hasDefault = finalAssistants.some(a => a.isDefault);
        
        // 如果没有默认助手且列表不为空，将第一个设为默认
        if (!hasDefault && finalAssistants.length > 0) {
          finalAssistants = finalAssistants.map((a, index) => ({
            ...a,
            isDefault: index === 0 // 只将第一个设为默认
          }));
          
          // 如果当前没有选中的助手，则选择默认助手
          if (!newCurrentAssistantId) {
            newCurrentAssistantId = finalAssistants[0].id;
          }
        }
        
        // 一次性更新设置，避免多次渲染导致的闪烁
        await setSettings({
          ...settings,
          assistants: finalAssistants,
          currentAssistantId: newCurrentAssistantId,
        });
      }
    };
    
    // 打开确认对话框
    modal.open();
  };

  // 防止重复点击的标记
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const handleSetDefault = async (id: string) => {
    // 如果已经在设置中，则跳过
    if (isSettingDefault) return;
    
    // 设置正在处理标记
    setIsSettingDefault(true);
    
    try {
      // 检查是否已经是默认助手
      const targetAssistant = assistants.find(a => a.id === id);
      if (targetAssistant && targetAssistant.isDefault) {
        // 如果已经是默认助手，什么也不做
        setIsSettingDefault(false);
        return;
      }
      
      // 确保只有一个助手被设置为默认
      const updatedAssistants = assistants.map((assistant: Assistant) => ({
        ...assistant,
        isDefault: assistant.id === id
      }));
      
      // 同时更新当前选中的助手
      await setSettings({
        ...settings,
        assistants: updatedAssistants,
        currentAssistantId: id,
      });
    } catch (error) {
      console.error('设置默认助手时出错:', error);
    } finally {
      // 重置处理标记
      setIsSettingDefault(false);
    }
  };

  return (
    <div className="smtcmp-settings-section" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <h2 className="smtcmp-settings-header" style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 'bold'
        }}>自定义助手</h2>
        
        <button
          onClick={handleAddAssistant}
          aria-label="添加新助手"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '4px',
            backgroundColor: 'var(--interactive-accent)',
            color: 'var(--text-on-accent)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'medium',
            transition: 'background-color 0.2s ease'
          }}
        >
          <Plus size={16} />
          添加助手
        </button>
      </div>
      
      <div style={{
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '8px'
      }}>
        创建自定义助手，为不同的任务设置专属的系统提示词。每个助手都有自己的行为和能力。
      </div>

      {assistants.length === 0 ? (
        <div className="smtcmp-no-assistants" style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--background-secondary)',
          borderRadius: '8px',
          border: '1px dashed var(--background-modifier-border)',
          color: 'var(--text-muted)',
          fontSize: '15px'
        }}>
          <p style={{ margin: 0 }}>暂无自定义助手。点击上方的“添加助手”按钮来创建你的第一个助手。</p>
        </div>
      ) : (
        <div className="smtcmp-assistants-list" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {assistants.map((assistant: Assistant) => (
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