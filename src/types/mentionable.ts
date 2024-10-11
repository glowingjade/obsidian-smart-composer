import { TFile } from 'obsidian'

export type MentionableFile = {
  id: string
  type: 'file'
  file: TFile
}
export type MentionableCurrentFile = {
  id: string
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
  id: string
  type: 'block'
}
export type Mentionable =
  | MentionableFile
  | MentionableCurrentFile
  | MentionableBlock

export type SerializedMentionableFile = {
  id: string
  type: 'file'
  file: string
}
export type SerializedMentionableCurrentFile = {
  id: string
  type: 'current-file'
  file: string | null
}
export type SerializedMentionableBlock = {
  id: string
  type: 'block'
  content: string
  file: string
  startLine: number
  endLine: number
}
export type SerializedMentionable =
  | SerializedMentionableFile
  | SerializedMentionableCurrentFile
  | SerializedMentionableBlock
