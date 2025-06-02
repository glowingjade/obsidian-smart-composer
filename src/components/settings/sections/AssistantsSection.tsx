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
  // Track expanded state
  const [isExpanded, setIsExpanded] = useState(false);

  // Handle delete click
  const handleDeleteClick = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling to header
    onDelete(assistant.id);
  };
  
  // Handle setting as default assistant
  const handleSetAsDefault = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling to header
    if (!isDefault) { // Only allow setting as default when not already default
      onSetDefault(assistant.id);
    }
  };

  // Handle expand/collapse
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
                Default
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
              aria-label={`Set ${assistant.name} as default assistant`}
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
              Set as Default
            </button>
          )}
          
          <button 
            className="smtcmp-delete-assistant-btn" 
            aria-label={`Delete assistant ${assistant.name}`}
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
            }}>Name</label>
            <ObsidianTextInput
              value={assistant.name}
              onChange={(value) => onUpdate({ ...assistant, name: value })}
              placeholder="Enter assistant name"
            />
          </div>



          <ObsidianSetting
            name="System Prompt"
            desc="This prompt will be added to the beginning of every chat."
            className="smtcmp-settings-textarea-header"
          />
          
          <ObsidianSetting className="smtcmp-settings-textarea">
            <ObsidianTextArea
              value={assistant.systemPrompt || ''}
              onChange={(value) => onUpdate({ ...assistant, systemPrompt: value })}
              placeholder="Enter system prompt to define assistant's behavior and capabilities"
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
      name: `New Assistant ${assistants.length + 1}`,
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

    // Track confirmation status
    let confirmed = false;
    
    // Create confirmation dialog
    const modal = new ConfirmModal(
      app,
      {
        title: `Confirm Delete Assistant`,
        message: `Are you sure you want to delete assistant "${assistantToDelete.name}"? This action cannot be undone.`,
        ctaText: 'Delete',
        onConfirm: () => {
          confirmed = true;
        }
      }
    );
    
    modal.onClose = async () => {
      if (confirmed) {
        // First filter out the assistant to be deleted
        const updatedAssistants = assistants.filter((a) => a.id !== id);
        
        // Determine new current assistant ID
        let newCurrentAssistantId = settings.currentAssistantId;
        if (id === settings.currentAssistantId) {
          // If the deleted assistant is currently selected, choose the first available assistant
          newCurrentAssistantId = updatedAssistants.length > 0 ? updatedAssistants[0].id : undefined;
        }
        
        // Handle default assistant logic
        let finalAssistants = [...updatedAssistants];
        
        // Check if there's still a default assistant
        const hasDefault = finalAssistants.some(a => a.isDefault);
        
        // If no default assistant and list is not empty, set the first one as default
        if (!hasDefault && finalAssistants.length > 0) {
          finalAssistants = finalAssistants.map((a, index) => ({
            ...a,
            isDefault: index === 0 // Only set the first one as default
          }));
          
          // If no assistant is currently selected, select the default assistant
          if (!newCurrentAssistantId) {
            newCurrentAssistantId = finalAssistants[0].id;
          }
        }
        
        // Update settings in one go to avoid flickering from multiple renders
        await setSettings({
          ...settings,
          assistants: finalAssistants,
          currentAssistantId: newCurrentAssistantId,
        });
      }
    };
    
    // Open confirmation dialog
    modal.open();
  };

  // Flag to prevent duplicate clicks
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  const handleSetDefault = async (id: string) => {
    // Skip if already processing
    if (isSettingDefault) return;
    
    // Set processing flag
    setIsSettingDefault(true);
    
    try {
      // Check if already the default assistant
      const targetAssistant = assistants.find(a => a.id === id);
      if (targetAssistant && targetAssistant.isDefault) {
        // If already default, do nothing
        setIsSettingDefault(false);
        return;
      }
      
      // Ensure only one assistant is set as default
      const updatedAssistants = assistants.map((assistant: Assistant) => ({
        ...assistant,
        isDefault: assistant.id === id
      }));
      
      // Also update the currently selected assistant
      await setSettings({
        ...settings,
        assistants: updatedAssistants,
        currentAssistantId: id,
      });
    } catch (error) {
      console.error('Error setting default assistant:', error);
    } finally {
      // Reset processing flag
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
        }}>Custom Assistants</h2>
        
        <button
          onClick={handleAddAssistant}
          aria-label="Add new assistant"
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
          Add Assistant
        </button>
      </div>
      
      <div style={{
        fontSize: '14px',
        color: 'var(--text-muted)',
        marginBottom: '8px'
      }}>
        Create custom assistants with dedicated system prompts for different tasks. Each assistant has its own behavior and capabilities.
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
          <p style={{ margin: 0 }}>No custom assistants yet. Click the "Add Assistant" button above to create your first assistant.</p>
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