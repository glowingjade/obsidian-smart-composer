import { TFile } from 'obsidian'

export type MentionableFile = {
  type: 'file'
  file: TFile
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
  | MentionableCurrentFile
  | MentionableBlock

export type SerializedMentionableFile = {
  type: 'file'
  file: string
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
  | SerializedMentionableCurrentFile
  | SerializedMentionableBlock
