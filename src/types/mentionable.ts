import { TFile, TFolder } from 'obsidian'

export type MentionableFile = {
  type: 'file'
  file: TFile
}
export type MentionableFolder = {
  type: 'folder'
  folder: TFolder
}
export type MentionableVault = {
  type: 'vault'
}
export type MentionableCurrentFile = {
  type: 'current-file'
  file: TFile | null
}
export type MentionableBlockData = {
  content: string
  file: TFile
  startLine: number
  endLine: number
}
export type MentionableBlock = MentionableBlockData & {
  type: 'block'
}
export type Mentionable =
  | MentionableFile
  | MentionableFolder
  | MentionableVault
  | MentionableCurrentFile
  | MentionableBlock

export type SerializedMentionableFile = {
  type: 'file'
  file: string
}
export type SerializedMentionableFolder = {
  type: 'folder'
  folder: string
}
export type SerializedMentionableVault = {
  type: 'vault'
}
export type SerializedMentionableCurrentFile = {
  type: 'current-file'
  file: string | null
}
export type SerializedMentionableBlock = {
  type: 'block'
  content: string
  file: string
  startLine: number
  endLine: number
}
export type SerializedMentionable =
  | SerializedMentionableFile
  | SerializedMentionableFolder
  | SerializedMentionableVault
  | SerializedMentionableCurrentFile
  | SerializedMentionableBlock
