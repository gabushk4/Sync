import { LinkProps } from "expo-router"
import { TextInputProps } from "react-native"

export type AppSettings = {
	language: 'en' | 'fr'
	timezone: string,
	theme: number
}

export const DEFAULT_SETTINGS: AppSettings = {
	language: 'fr',
	timezone: 'Etc/UTC',
	theme: 260
}

export type SettingKey = keyof AppSettings

export type SettingsRepository = {
  load: () => Promise<Partial<AppSettings>>
  save: (changes: Partial<AppSettings>) => Promise<void>
}

type SettingBase = {
	id: string
	titleKey: string
	descriptionKey?: string
	disabled?: boolean
}

type ToggleSetting = SettingBase & {
	type: 'toggle'
	value: boolean
	onValueChange: (value: boolean) => void | Promise<void>
}

type DropdownSetting<T extends string = string> = SettingBase & {
	type: 'dropdown'
	value: T
	options: Array<{
		value: T
		titleKey?: string
		title?: string
	}>
	onValueChange: (value: T) => void
}

type LinkSetting = SettingBase & {
	type: 'link'
	href: LinkProps['href'] 
}

type InputSettings = SettingBase & {
	type: 'input'
	value: TextInputProps['value']
	keyboardType: TextInputProps['keyboardType']
	onChangeText: TextInputProps['onChangeText']
	onBlur: TextInputProps['onBlur']
	setDefault?: {
		labelKey: string,
		onPress: () => void
	}
}

type Section = {
	id: string
	titleKey: string
	type: 'section'
	settings: Setting[]
}

type Setting =
	| ToggleSetting
	| DropdownSetting
	| LinkSetting
	| Section
	| InputSettings

export default Setting
