import { App, Platform, Plugin, PluginSettingTab, Setting } from 'obsidian';
import {VexTab, Artist, Vex} from './vextab-dist/main.prod';
import './styles.css'

interface ObsidianVextabSettings {
	scale: string;
	width: string;
	includeTabstave: boolean;
	includeNotation: boolean;
}

const DEFAULT_SCALE = "0.8"
const DEFAULT_WIDTH = "550"
const DEFAULT_SETTINGS: ObsidianVextabSettings = {
	scale: DEFAULT_SCALE,
	width: DEFAULT_WIDTH,
	includeTabstave: true,
	includeNotation: false
}

export default class ObsidianVextab extends Plugin {
	settings: ObsidianVextabSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new VextabSettingsTab(this.app, this));

		this.registerMarkdownCodeBlockProcessor("tab", async (source: string, el, ctx) =>
			this.renderVextab(source, el)
		);

		this.registerMarkdownCodeBlockProcessor("vextab", async (source: string, el, ctx) =>
			this.renderVextab(source, el)
		);

		this.registerMarkdownCodeBlockProcessor("quicktab", async (source: string, el, ctx) =>
			this.renderQuickTab(source, el)
		);
	}

	async renderQuickTab(source: string, element: HTMLElement) {
		// Build the default options from the plugin settings
		let defaultString;
		const defaultOptions = []
		if (this.settings.includeTabstave) {
			defaultOptions.push("tabstave");
		}
		if (this.settings.includeNotation) {
			defaultOptions.push("notation=true");
		}
		if (defaultOptions.length > 0) {
			defaultString = defaultOptions.join(" ");
		}

		// Any line that does not have a keyword is assumed to be "notes"
		let sourceArr = source.split("\n");
		sourceArr = sourceArr.map(function(line){
			if (
				line.startsWith("notes") ||
				line.startsWith("text") ||
				line.startsWith("options") ||
				line == ''
			) {
				return line
			} else {
				return `notes ${line}`
			}
		})
		source = sourceArr.join("\n")

		// Append default options to the first line
		source = [defaultString, source].join("\n")
		// Double newlines are assumed to be new tabstaves
		source = source.replace("\n\n", `\n\n${defaultString}\n`)

		this.renderVextab(source, element)
	}

	async renderVextab(source: string, element: HTMLElement) {
		element.style.backgroundColor = "#FFFFFF";

		// Add edit button for mobile, since the default one is invisible
		if (Platform.isMobile) {
			const editButton = document.createElement('span');
			editButton.style.float = "right"
			editButton.style.paddingRight = "5px"
			editButton.style.color = "#808080"
			editButton.style.fontFamily = "Inter"
			editButton.appendChild(document.createTextNode("Edit"))
			element.appendChild(editButton)
		}

		// Render tab using the VexTab API
		const Renderer = Vex.Flow.Renderer;

		const renderer = new Renderer(element, Renderer.Backends.SVG);
		const artist = new Artist(10, 10, Number(this.settings.width), { scale: Number(this.settings.scale) });
		const tab = new VexTab(artist);

		try {
			tab.parse(source);
			artist.render(renderer);
		} catch (e) {
			console.error(e);
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class VextabSettingsTab extends PluginSettingTab {
	plugin: ObsidianVextab;

	constructor(app: App, plugin: ObsidianVextab) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h1', {text: 'Vextab Settings'});

		containerEl.createEl('p', {text: 'Reload the current note for these changes to take effect'});

		containerEl.createEl('h3', {text: 'General Settings'});

		new Setting(containerEl)
			.setName('Scale')
			.setDesc(`Controls the size of the rendered tab. Default value is ${DEFAULT_SCALE}`)
			.addText(text => text
				.setPlaceholder(DEFAULT_SCALE)
				.setValue(this.plugin.settings.scale)
				.onChange(async (value) => {
					this.plugin.settings.scale = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
				.setName('Width')
				.setDesc(`Controls the width of the tab canvas. Default value is ${DEFAULT_WIDTH}`)
				.addText(text => text
					.setPlaceholder(DEFAULT_WIDTH)
					.setValue(this.plugin.settings.width)
					.onChange(async (value) => {
						this.plugin.settings.width = value;
						await this.plugin.saveSettings();
					}));

		containerEl.createEl('h3', {text: 'Quicktab Settings'});

		new Setting(containerEl)
			.setName('Include tabstave')
			.setDesc('Includes "tabstave" in each quicktab block by default. You can always include this manually if this option is turned off.')
			.addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.includeTabstave)
					.onChange(async value => {
						this.plugin.settings.includeTabstave = value;
						await this.plugin.saveSettings();
					})
			);
			
		new Setting(containerEl)
		.setName('Include notation')
		.setDesc('Includes "notation=true" in each quicktab block by default. You can always include this manually if this option is turned off.')
		.addToggle(toggle =>
			toggle
				.setValue(this.plugin.settings.includeNotation)
				.onChange(async value => {
					this.plugin.settings.includeNotation = value;
					await this.plugin.saveSettings();
				})
		);
	}
}
