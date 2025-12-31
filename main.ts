import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, ItemView, Menu, Notice, Modal, TFile, TFolder, requestUrl, MarkdownRenderer, setIcon } from 'obsidian';

// Highlight color definition
interface HighlightColor {
	name: string;
	color: string; // Hex (#ffeb3b) or RGB (rgb(255, 235, 59))
}

// Collection verse definition
interface CollectionVerse {
	reference: string; // e.g., "John 3:16" or "Romans 8:28-30"
	completed: boolean;
	notes?: string;
}

// Smart collection definition
interface Collection {
	id: string;
	name: string;
	description?: string;
	createdAt: number;
	verses: CollectionVerse[];
}

// Journal entry data structure
interface JournalEntry {
	id: string; // Unique ID
	date: string; // ISO date string
	type: 'session' | 'manual';
	// For session entries:
	duration?: number; // Minutes
	chaptersVisited?: string[]; // "Book Chapter" format
	versesRead?: number;
	notesCreated?: number;
	highlightsAdded?: number;
	// For manual entries:
	content?: string; // User-written reflection/notes
}

// Plugin settings interface
interface BiblePortalSettings {
	bibleVersions: string[]; // Available versions
	defaultVersion: string;
	notesFolder: string;
	parallelViewEnabled: boolean;
	highlightColors: HighlightColor[]; // Available highlight colors with names
	highlightStyle: 'solid' | 'gradient' | 'handdrawn'; // Highlight rendering style

	// Appearance
	fontSize: number; // Font size in pixels (default: 16)
	fontFamily: string; // Font family (default: system)
	fontStyle: 'sans-serif' | 'serif'; // Font style for verse text
	readableLineLength: boolean; // Enable readable line length (limit content width)
	bannerIcon: string; // Emoji or icon for banner (default: 📖)
	bannerColor: string; // Banner background color
	bannerTheme: 'parchment' | 'holy-light' | 'royal' | 'sacrifice' | 'ocean' | 'custom'; // Banner theme
	verseNumberStyle: 'default' | 'superscript' | 'badge' | 'margin' | 'subtle'; // Verse number display style

	// Copy & Export
	copyIncludeReference: boolean; // Include verse reference when copying
	copyIncludeFormatting: boolean; // Include formatting (bold/italic) when copying
	calloutTitle: string; // Callout type for copied verses (default: "bible")
	imageExportFolder: string; // Folder for exported images
	imageExportQuality: number; // Image quality 0-100 (default: 75)

	// Verse of the Day
	verseOfTheDayEnabled: boolean; // Show Verse of the Day

	// Search
	defaultSearchScope: 'all' | 'book' | 'chapter'; // Default search scope

	// Notes
	noteTemplate: string; // Template for new verse notes (supports variables: {{reference}}, {{version}}, {{verse}}, {{verseText}})

	// Strong's Concordance
	enableStrongs: boolean; // Enable Strong's Concordance features
	strongsDictionaryPath: string; // Path to Strong's dictionary JSON
	strongsTooltipMode: 'hover' | 'click'; // Show tooltip on hover or click
	strongsShowRelated: boolean; // Show related words in tooltip
	strongsOriginalFontSize: number; // Font size for original language text (default: 20)

	// Jesus Words
	enableJesusWords: boolean; // Enable red-letter Jesus words
	jesusWordsColor: string; // Color for Jesus' words (default: red)
	jesusWordsShowMetadata: boolean; // Show metadata tooltips on hover
	showDisputedPassages: boolean; // Indicate disputed/textual variant passages
	showDisputedTooltips: boolean; // Show explanatory tooltips for disputed passages

	// Feature Toggles
	showCrossReferences: boolean; // Show cross-reference indicators (default: true)
	showNoteIndicators: boolean; // Show note indicators (default: true)
	showTagIndicators: boolean; // Show tag indicators (default: true)

	// Theographic Metadata (people, places, events)
	enableTheographic: boolean; // Enable Theographic features
	theographicDataPath: string; // Path to Theographic data folder (contains people.json, places.json, etc.)
	theographicShowPeople: boolean; // Show people in contextual sidebar
	theographicShowPlaces: boolean; // Show places in contextual sidebar
	theographicShowEvents: boolean; // Show events in contextual sidebar

	// Navigation
	homeVerse: string; // Home verse (e.g., "John 3:16")
	showSecondaryNav: boolean; // Show secondary nav bar (version, toggles)

	// Onboarding
	showOnboarding: boolean; // Show onboarding hints for new users
	onboardingComplete: boolean; // Whether user has seen all hints

	// Study Session Tracking
	enableSessionTracking: boolean; // Track study session statistics
	studyStreak: number; // Current consecutive days streak
	lastStudyDate: string; // Last study date (YYYY-MM-DD)

	// Reading Plans
	enableReadingPlan: boolean; // Enable reading plan feature
	activeReadingPlans: string[]; // Array of active plan IDs (supports multiple plans)
	readingPlanStartDates: { [planId: string]: string }; // Start date per plan (YYYY-MM-DD)
	readingPlanProgress: { [planId: string]: number[] }; // Array of completed day numbers per plan
	readingPlanMode: 'normal' | 'catch-up' | 'skip-ahead'; // Adaptive scheduling mode
	readingPlanReminder: boolean; // Show reminder on startup if reading not done
	customReadingPlans: CustomReadingPlan[]; // User-created reading plans

	// Annotation Layers (15G)
	annotationLayers: AnnotationLayer[]; // Available layers
	activeAnnotationLayer: string; // Currently active layer for new annotations
	visibleAnnotationLayers: string[]; // Which layers are visible

	// Memorization Mode (15H)
	enableMemorization: boolean; // Enable memorization feature
	memorizationVerses: MemorizationVerse[]; // Verses being memorized
	memorizationSettings: MemorizationSettings; // SRS settings

	// Achievements
	enableAchievements: boolean; // Enable achievement system
	unlockedAchievements: string[]; // Array of unlocked achievement IDs
	achievementStats: AchievementStats; // Stats for tracking progress

	// Tags
	registeredTags: string[]; // User-created tag names (for tags not yet applied to verses)

	// Smart Collections
	collections: Collection[]; // User's study collections

	// Study Journal
	journalEntries: JournalEntry[]; // Study journal entries

	// Study History (for insights/analytics)
	studyHistory: StudyHistory;

	// Context Sidebar (15C)
	showContextSidebar: boolean; // Show contextual sidebar on right
	contextSidebarTab: 'commentary' | 'word-study' | 'context' | 'parallels' | 'notes'; // Active tab
	contextSidebarWidth: number; // Width in pixels (default: 350)
}

// Study history data structure
interface StudyHistory {
	totalStudyMinutes: number;
	bookVisits: Record<string, number>; // book name -> visit count
	chapterVisits: Record<string, number>; // "Book Chapter" -> visit count
	weeklyStats: WeeklyStat[];
}

interface WeeklyStat {
	weekStart: string; // ISO date of week start (YYYY-MM-DD)
	minutes: number;
	chapters: number;
	verses: number;
	notes: number;
	highlights: number;
}

// Study session data structure
interface StudySession {
	startTime: number; // Timestamp
	versesRead: Set<string>; // "Book Chapter:Verse" format
	notesCreated: number;
	highlightsAdded: number;
	chaptersVisited: Set<string>; // "Book Chapter" format
}

// Reading plan data structure
interface ReadingPlan {
	id: string;
	name: string;
	description: string;
	totalDays: number;
	readings: ReadingPlanDay[];
}

interface ReadingPlanDay {
	day: number;
	passages: string[]; // e.g., ["Genesis 1-2", "Psalm 1"]
}

// Custom reading plan (user-created)
interface CustomReadingPlan extends ReadingPlan {
	isCustom: true;
	createdDate: string;
}

// Annotation Layer (15G)
interface AnnotationLayer {
	id: string;
	name: string;
	color: string; // Accent color for layer identification
	createdDate: string;
	isDefault: boolean; // Default layers can't be deleted
}

// Memorization verse (15H)
interface MemorizationVerse {
	reference: string; // e.g., "John 3:16"
	text: string; // Full verse text
	version: string; // Bible version
	layer?: string; // Optional layer assignment
	// SM-2 algorithm fields
	easeFactor: number; // Starting at 2.5
	interval: number; // Days until next review
	repetitions: number; // Number of successful reviews
	nextReview: string; // ISO date
	lastReview: string; // ISO date
	status: 'new' | 'learning' | 'reviewing' | 'mastered';
	createdDate: string;
}

// Memorization settings
interface MemorizationSettings {
	newCardsPerDay: number; // How many new cards to introduce daily
	reviewsPerDay: number; // Max reviews per day
	showHints: boolean; // Show first letter hints
	autoAdvance: boolean; // Auto-advance after correct answer
}

// Predefined reading plans
const READING_PLANS: ReadingPlan[] = [
	{
		id: 'bible-year',
		name: 'Bible in a Year',
		description: 'Read through the entire Bible in 365 days with Old Testament, New Testament, and Psalms/Proverbs daily.',
		totalDays: 365,
		readings: generateBibleInYearPlan()
	},
	{
		id: 'nt-90',
		name: 'New Testament in 90 Days',
		description: 'Read through the New Testament in 90 days, about 3 chapters per day.',
		totalDays: 90,
		readings: generateNT90Plan()
	},
	{
		id: 'gospels-30',
		name: 'Gospels in 30 Days',
		description: 'Read through Matthew, Mark, Luke, and John in 30 days.',
		totalDays: 30,
		readings: generateGospels30Plan()
	},
	{
		id: 'psalms-month',
		name: 'Psalms in a Month',
		description: 'Read through all 150 Psalms in 30 days, 5 psalms per day.',
		totalDays: 30,
		readings: generatePsalmsMonthPlan()
	}
];

// Generate Bible in a Year plan (simplified - major daily readings)
function generateBibleInYearPlan(): ReadingPlanDay[] {
	const plan: ReadingPlanDay[] = [];
	const otBooks = [
		{ book: 'Genesis', chapters: 50 }, { book: 'Exodus', chapters: 40 },
		{ book: 'Leviticus', chapters: 27 }, { book: 'Numbers', chapters: 36 },
		{ book: 'Deuteronomy', chapters: 34 }, { book: 'Joshua', chapters: 24 },
		{ book: 'Judges', chapters: 21 }, { book: 'Ruth', chapters: 4 },
		{ book: '1 Samuel', chapters: 31 }, { book: '2 Samuel', chapters: 24 },
		{ book: '1 Kings', chapters: 22 }, { book: '2 Kings', chapters: 25 },
		{ book: '1 Chronicles', chapters: 29 }, { book: '2 Chronicles', chapters: 36 },
		{ book: 'Ezra', chapters: 10 }, { book: 'Nehemiah', chapters: 13 },
		{ book: 'Esther', chapters: 10 }, { book: 'Job', chapters: 42 },
		{ book: 'Proverbs', chapters: 31 }, { book: 'Ecclesiastes', chapters: 12 },
		{ book: 'Song of Solomon', chapters: 8 }, { book: 'Isaiah', chapters: 66 },
		{ book: 'Jeremiah', chapters: 52 }, { book: 'Lamentations', chapters: 5 },
		{ book: 'Ezekiel', chapters: 48 }, { book: 'Daniel', chapters: 12 },
		{ book: 'Hosea', chapters: 14 }, { book: 'Joel', chapters: 3 },
		{ book: 'Amos', chapters: 9 }, { book: 'Obadiah', chapters: 1 },
		{ book: 'Jonah', chapters: 4 }, { book: 'Micah', chapters: 7 },
		{ book: 'Nahum', chapters: 3 }, { book: 'Habakkuk', chapters: 3 },
		{ book: 'Zephaniah', chapters: 3 }, { book: 'Haggai', chapters: 2 },
		{ book: 'Zechariah', chapters: 14 }, { book: 'Malachi', chapters: 4 }
	];
	const ntBooks = [
		{ book: 'Matthew', chapters: 28 }, { book: 'Mark', chapters: 16 },
		{ book: 'Luke', chapters: 24 }, { book: 'John', chapters: 21 },
		{ book: 'Acts', chapters: 28 }, { book: 'Romans', chapters: 16 },
		{ book: '1 Corinthians', chapters: 16 }, { book: '2 Corinthians', chapters: 13 },
		{ book: 'Galatians', chapters: 6 }, { book: 'Ephesians', chapters: 6 },
		{ book: 'Philippians', chapters: 4 }, { book: 'Colossians', chapters: 4 },
		{ book: '1 Thessalonians', chapters: 5 }, { book: '2 Thessalonians', chapters: 3 },
		{ book: '1 Timothy', chapters: 6 }, { book: '2 Timothy', chapters: 4 },
		{ book: 'Titus', chapters: 3 }, { book: 'Philemon', chapters: 1 },
		{ book: 'Hebrews', chapters: 13 }, { book: 'James', chapters: 5 },
		{ book: '1 Peter', chapters: 5 }, { book: '2 Peter', chapters: 3 },
		{ book: '1 John', chapters: 5 }, { book: '2 John', chapters: 1 },
		{ book: '3 John', chapters: 1 }, { book: 'Jude', chapters: 1 },
		{ book: 'Revelation', chapters: 22 }
	];

	// Calculate total OT and NT chapters
	const totalOT = otBooks.reduce((sum, b) => sum + b.chapters, 0); // 929
	const totalNT = ntBooks.reduce((sum, b) => sum + b.chapters, 0); // 260

	// Spread readings across 365 days
	let otChapter = 0;
	let ntChapter = 0;
	let currentOTBook = 0;
	let currentNTBook = 0;
	let otChapInBook = 1;
	let ntChapInBook = 1;

	for (let day = 1; day <= 365; day++) {
		const passages: string[] = [];

		// OT reading (about 3 chapters per day)
		const otPerDay = Math.ceil((totalOT - otChapter) / (366 - day));
		for (let i = 0; i < Math.min(otPerDay, 3) && currentOTBook < otBooks.length; i++) {
			passages.push(`${otBooks[currentOTBook].book} ${otChapInBook}`);
			otChapInBook++;
			otChapter++;
			if (otChapInBook > otBooks[currentOTBook].chapters) {
				currentOTBook++;
				otChapInBook = 1;
			}
		}

		// NT reading (about 1 chapter per day)
		if (currentNTBook < ntBooks.length) {
			passages.push(`${ntBooks[currentNTBook].book} ${ntChapInBook}`);
			ntChapInBook++;
			ntChapter++;
			if (ntChapInBook > ntBooks[currentNTBook].chapters) {
				currentNTBook++;
				ntChapInBook = 1;
			}
		}

		// Psalm (cycle through) - Note: Bible data uses singular "Psalm"
		const psalmNum = ((day - 1) % 150) + 1;
		passages.push(`Psalm ${psalmNum}`);

		plan.push({ day, passages });
	}

	return plan;
}

// Generate NT in 90 Days plan
function generateNT90Plan(): ReadingPlanDay[] {
	const plan: ReadingPlanDay[] = [];
	const ntBooks = [
		{ book: 'Matthew', chapters: 28 }, { book: 'Mark', chapters: 16 },
		{ book: 'Luke', chapters: 24 }, { book: 'John', chapters: 21 },
		{ book: 'Acts', chapters: 28 }, { book: 'Romans', chapters: 16 },
		{ book: '1 Corinthians', chapters: 16 }, { book: '2 Corinthians', chapters: 13 },
		{ book: 'Galatians', chapters: 6 }, { book: 'Ephesians', chapters: 6 },
		{ book: 'Philippians', chapters: 4 }, { book: 'Colossians', chapters: 4 },
		{ book: '1 Thessalonians', chapters: 5 }, { book: '2 Thessalonians', chapters: 3 },
		{ book: '1 Timothy', chapters: 6 }, { book: '2 Timothy', chapters: 4 },
		{ book: 'Titus', chapters: 3 }, { book: 'Philemon', chapters: 1 },
		{ book: 'Hebrews', chapters: 13 }, { book: 'James', chapters: 5 },
		{ book: '1 Peter', chapters: 5 }, { book: '2 Peter', chapters: 3 },
		{ book: '1 John', chapters: 5 }, { book: '2 John', chapters: 1 },
		{ book: '3 John', chapters: 1 }, { book: 'Jude', chapters: 1 },
		{ book: 'Revelation', chapters: 22 }
	];

	let currentBook = 0;
	let chapInBook = 1;

	for (let day = 1; day <= 90; day++) {
		const passages: string[] = [];

		// About 3 chapters per day
		for (let i = 0; i < 3 && currentBook < ntBooks.length; i++) {
			passages.push(`${ntBooks[currentBook].book} ${chapInBook}`);
			chapInBook++;
			if (chapInBook > ntBooks[currentBook].chapters) {
				currentBook++;
				chapInBook = 1;
			}
		}

		if (passages.length > 0) {
			plan.push({ day, passages });
		}
	}

	return plan;
}

// Generate Gospels in 30 Days plan
function generateGospels30Plan(): ReadingPlanDay[] {
	const plan: ReadingPlanDay[] = [];
	const gospels = [
		{ book: 'Matthew', chapters: 28 },
		{ book: 'Mark', chapters: 16 },
		{ book: 'Luke', chapters: 24 },
		{ book: 'John', chapters: 21 }
	];

	let currentBook = 0;
	let chapInBook = 1;

	for (let day = 1; day <= 30; day++) {
		const passages: string[] = [];

		// About 3 chapters per day
		for (let i = 0; i < 3 && currentBook < gospels.length; i++) {
			passages.push(`${gospels[currentBook].book} ${chapInBook}`);
			chapInBook++;
			if (chapInBook > gospels[currentBook].chapters) {
				currentBook++;
				chapInBook = 1;
			}
		}

		if (passages.length > 0) {
			plan.push({ day, passages });
		}
	}

	return plan;
}

// Generate Psalms in a Month plan
function generatePsalmsMonthPlan(): ReadingPlanDay[] {
	const plan: ReadingPlanDay[] = [];

	for (let day = 1; day <= 30; day++) {
		const passages: string[] = [];

		// 5 psalms per day - Note: Bible data uses singular "Psalm"
		for (let i = 0; i < 5; i++) {
			const psalmNum = (day - 1) * 5 + i + 1;
			if (psalmNum <= 150) {
				passages.push(`Psalm ${psalmNum}`);
			}
		}

		plan.push({ day, passages });
	}

	return plan;
}

// Achievement data structures
interface AchievementStats {
	totalChaptersRead: number;
	totalNotesCreated: number;
	totalHighlightsAdded: number;
	totalBookmarksAdded: number;
	booksCompleted: string[]; // Array of book names
	longestStreak: number;
	totalStudyMinutes: number;
}

interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string; // Lucide icon name
	category: 'reading' | 'notes' | 'highlights' | 'streaks' | 'milestones';
	requirement: (stats: AchievementStats, settings: BiblePortalSettings) => boolean;
	rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
	// Reading achievements
	{
		id: 'first-chapter',
		name: 'First Steps',
		description: 'Read your first chapter',
		icon: 'book-open',
		category: 'reading',
		requirement: (stats) => stats.totalChaptersRead >= 1,
		rarity: 'common'
	},
	{
		id: 'ten-chapters',
		name: 'Getting Into It',
		description: 'Read 10 chapters',
		icon: 'book-open',
		category: 'reading',
		requirement: (stats) => stats.totalChaptersRead >= 10,
		rarity: 'common'
	},
	{
		id: 'fifty-chapters',
		name: 'Dedicated Reader',
		description: 'Read 50 chapters',
		icon: 'book-open',
		category: 'reading',
		requirement: (stats) => stats.totalChaptersRead >= 50,
		rarity: 'uncommon'
	},
	{
		id: 'hundred-chapters',
		name: 'Centurion',
		description: 'Read 100 chapters',
		icon: 'book-open',
		category: 'reading',
		requirement: (stats) => stats.totalChaptersRead >= 100,
		rarity: 'rare'
	},
	{
		id: 'first-book',
		name: 'Book Worm',
		description: 'Complete reading an entire book of the Bible',
		icon: 'book-marked',
		category: 'reading',
		requirement: (stats) => stats.booksCompleted.length >= 1,
		rarity: 'uncommon'
	},
	{
		id: 'five-books',
		name: 'Library Card',
		description: 'Complete 5 books of the Bible',
		icon: 'library',
		category: 'reading',
		requirement: (stats) => stats.booksCompleted.length >= 5,
		rarity: 'rare'
	},
	// Notes achievements
	{
		id: 'first-note',
		name: 'Scribe',
		description: 'Create your first note',
		icon: 'sticky-note',
		category: 'notes',
		requirement: (stats) => stats.totalNotesCreated >= 1,
		rarity: 'common'
	},
	{
		id: 'ten-notes',
		name: 'Note Taker',
		description: 'Create 10 notes',
		icon: 'sticky-note',
		category: 'notes',
		requirement: (stats) => stats.totalNotesCreated >= 10,
		rarity: 'uncommon'
	},
	{
		id: 'fifty-notes',
		name: 'Prolific Writer',
		description: 'Create 50 notes',
		icon: 'notebook-pen',
		category: 'notes',
		requirement: (stats) => stats.totalNotesCreated >= 50,
		rarity: 'rare'
	},
	// Highlights achievements
	{
		id: 'first-highlight',
		name: 'Highlighter',
		description: 'Add your first highlight',
		icon: 'highlighter',
		category: 'highlights',
		requirement: (stats) => stats.totalHighlightsAdded >= 1,
		rarity: 'common'
	},
	{
		id: 'twenty-highlights',
		name: 'Color Coder',
		description: 'Add 20 highlights',
		icon: 'highlighter',
		category: 'highlights',
		requirement: (stats) => stats.totalHighlightsAdded >= 20,
		rarity: 'uncommon'
	},
	{
		id: 'hundred-highlights',
		name: 'Rainbow Scholar',
		description: 'Add 100 highlights',
		icon: 'palette',
		category: 'highlights',
		requirement: (stats) => stats.totalHighlightsAdded >= 100,
		rarity: 'rare'
	},
	// Streak achievements
	{
		id: 'three-day-streak',
		name: 'Consistent',
		description: 'Maintain a 3-day study streak',
		icon: 'flame',
		category: 'streaks',
		requirement: (stats, settings) => settings.studyStreak >= 3 || stats.longestStreak >= 3,
		rarity: 'common'
	},
	{
		id: 'seven-day-streak',
		name: 'Week Warrior',
		description: 'Maintain a 7-day study streak',
		icon: 'flame',
		category: 'streaks',
		requirement: (stats, settings) => settings.studyStreak >= 7 || stats.longestStreak >= 7,
		rarity: 'uncommon'
	},
	{
		id: 'thirty-day-streak',
		name: 'Monthly Master',
		description: 'Maintain a 30-day study streak',
		icon: 'flame',
		category: 'streaks',
		requirement: (stats, settings) => settings.studyStreak >= 30 || stats.longestStreak >= 30,
		rarity: 'rare'
	},
	{
		id: 'hundred-day-streak',
		name: 'Century Club',
		description: 'Maintain a 100-day study streak',
		icon: 'trophy',
		category: 'streaks',
		requirement: (stats, settings) => settings.studyStreak >= 100 || stats.longestStreak >= 100,
		rarity: 'epic'
	},
	// Milestone achievements
	{
		id: 'new-testament',
		name: 'New Testament Scholar',
		description: 'Complete all books of the New Testament',
		icon: 'award',
		category: 'milestones',
		requirement: (stats) => {
			const ntBooks = ['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
				'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
				'1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
				'1 John', '2 John', '3 John', 'Jude', 'Revelation'];
			return ntBooks.every(book => stats.booksCompleted.includes(book));
		},
		rarity: 'legendary'
	},
	{
		id: 'gospels',
		name: 'Gospel Reader',
		description: 'Complete all four Gospels',
		icon: 'heart',
		category: 'milestones',
		requirement: (stats) => {
			const gospels = ['Matthew', 'Mark', 'Luke', 'John'];
			return gospels.every(book => stats.booksCompleted.includes(book));
		},
		rarity: 'epic'
	},
	{
		id: 'reading-plan-complete',
		name: 'Plan Accomplished',
		description: 'Complete a reading plan',
		icon: 'check-circle',
		category: 'milestones',
		requirement: (stats, settings) => {
			const progress = settings.readingPlanProgress;
			// Check if ANY reading plan is completed
			for (const planId of Object.keys(progress)) {
				const plan = READING_PLANS.find(p => p.id === planId);
				if (plan && progress[planId].length >= plan.totalDays) {
					return true;
				}
			}
			return false;
		},
		rarity: 'epic'
	}
];

// Default achievement stats
const DEFAULT_ACHIEVEMENT_STATS: AchievementStats = {
	totalChaptersRead: 0,
	totalNotesCreated: 0,
	totalHighlightsAdded: 0,
	totalBookmarksAdded: 0,
	booksCompleted: [],
	longestStreak: 0,
	totalStudyMinutes: 0
};

// Highlight data structure
interface Highlight {
	id: string; // Unique ID
	book: string;
	chapter: number;
	verse: number;
	endVerse?: number; // Optional - for verse ranges
	text: string; // Highlighted text (or combined range text)
	color: string; // Highlight color
	startOffset?: number; // Character offset in verse (for word-level)
	endOffset?: number;
	layer?: string; // Annotation layer ID (defaults to 'personal')
}

// Note types
type NoteType = 'personal';

// Note reference structure
interface NoteReference {
	book: string;
	chapter: number;
	verse: number;
	endVerse?: number; // Optional - for passage notes
	noteLevel: 'verse' | 'passage' | 'chapter' | 'book'; // Note level
	noteType: NoteType; // Type of note
	notePath: string; // Path to note file in vault
	isPinned?: boolean; // Pinned notes appear at top
	createdAt?: number; // Timestamp when note was created
}

// Note type metadata
const NOTE_TYPES: { type: NoteType; icon: string; label: string; color: string }[] = [
	{ type: 'personal', icon: '📝', label: 'Note', color: '#10b981' }
];

// Disputed/Textual Variant Passages - well-known passages with manuscript differences
interface DisputedPassage {
	book: string;
	startChapter: number;
	startVerse: number;
	endChapter?: number;
	endVerse?: number;
	name: string;
	description: string;
	manuscriptInfo: string;
}

const DISPUTED_PASSAGES: DisputedPassage[] = [
	{
		book: 'Mark',
		startChapter: 16,
		startVerse: 9,
		endVerse: 20,
		name: 'Longer Ending of Mark',
		description: 'These verses are not found in the earliest and most reliable manuscripts. Many scholars believe Mark originally ended at 16:8.',
		manuscriptInfo: 'Missing from Codex Sinaiticus, Codex Vaticanus, and other early witnesses.'
	},
	{
		book: 'John',
		startChapter: 7,
		startVerse: 53,
		endChapter: 8,
		endVerse: 11,
		name: 'Pericope Adulterae (Woman Caught in Adultery)',
		description: 'This passage is not found in the earliest manuscripts and appears in different locations in various manuscripts.',
		manuscriptInfo: 'Missing from early papyri, Codex Sinaiticus, Codex Vaticanus. Added in later manuscripts.'
	},
	{
		book: '1 John',
		startChapter: 5,
		startVerse: 7,
		endVerse: 8,
		name: 'Johannine Comma',
		description: 'The Trinitarian formula "the Father, the Word, and the Holy Ghost" is not found in any Greek manuscript before the 14th century.',
		manuscriptInfo: 'Not found in Greek manuscripts before late medieval period. Appears only in some Latin manuscripts.'
	},
	{
		book: 'Acts',
		startChapter: 8,
		startVerse: 37,
		endVerse: 37,
		name: 'Ethiopian Eunuch Confession',
		description: 'This verse is not found in the earliest manuscripts and is omitted from many modern translations.',
		manuscriptInfo: 'Missing from Codex Sinaiticus, Codex Vaticanus, Codex Alexandrinus. Present in some Western texts.'
	},
	{
		book: 'Matthew',
		startChapter: 17,
		startVerse: 21,
		endVerse: 21,
		name: 'Prayer and Fasting',
		description: 'This verse appears to be an assimilation from Mark 9:29 and is not found in the earliest manuscripts.',
		manuscriptInfo: 'Missing from Codex Sinaiticus, Codex Vaticanus. Likely added later from Mark.'
	},
	{
		book: 'Matthew',
		startChapter: 18,
		startVerse: 11,
		endVerse: 11,
		name: 'Son of Man Saving the Lost',
		description: 'This verse is not found in the earliest manuscripts and appears to be borrowed from Luke 19:10.',
		manuscriptInfo: 'Missing from Codex Sinaiticus, Codex Vaticanus. Found in later manuscripts.'
	}
];

// Bookmark structure
interface Bookmark {
	id: string;
	name?: string; // User-defined name for the bookmark
	book: string;
	bookmarkLevel: 'book' | 'chapter' | 'verse'; // What level is bookmarked
	chapter?: number; // Optional for book-level bookmarks
	verse?: number; // Optional for book/chapter-level bookmarks
	endVerse?: number; // Optional - for verse ranges
	text?: string; // Verse text (or combined range text) - optional for book/chapter bookmarks
	note?: string; // Optional user note
	createdAt: number; // Timestamp
}

// Concordance data structure (word index)
interface ConcordanceReference {
	book: string;
	chapter: number;
	verse: number;
}

interface ConcordanceData {
	version: string;
	generated: boolean;
	stats: {
		uniqueWords: number;
		totalWords: number;
		totalVerses: number;
	};
	words: { [word: string]: ConcordanceReference[] };
}

// Verse tag structure (for topic tagging)
interface VerseTag {
	id: string;
	book: string;
	chapter: number;
	verse: number;
	tag: string; // The topic name (e.g., "faith", "healing")
	createdAt: number;
}

// Default settings
const DEFAULT_SETTINGS: BiblePortalSettings = {
	bibleVersions: [], // Auto-detected from Bible data folder
	defaultVersion: '', // Auto-set to first available version
	notesFolder: 'Bible Portal/Notes',
	parallelViewEnabled: false,
	highlightColors: [
		{ name: 'Yellow', color: '#ffeb3b' },
		{ name: 'Green', color: '#4caf50' },
		{ name: 'Blue', color: '#2196f3' },
		{ name: 'Orange', color: '#ff9800' },
		{ name: 'Pink', color: '#e91e63' }
	],
	highlightStyle: 'handdrawn', // Hand-drawn style by default for natural look

	// Appearance
	fontSize: 16,
	fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	fontStyle: 'sans-serif',
	readableLineLength: true, // Enable by default for better readability
	bannerIcon: '📖',
	bannerColor: '#4a5568',
	bannerTheme: 'parchment',
	verseNumberStyle: 'default',

	// Copy & Export
	copyIncludeReference: true,
	copyIncludeFormatting: true,
	calloutTitle: 'bible',
	imageExportFolder: 'Bible Portal/Images',
	imageExportQuality: 75,

	// Verse of the Day
	verseOfTheDayEnabled: true,

	// Search
	defaultSearchScope: 'all',

	// Notes
	noteTemplate: `# {{reference}}

**Version:** {{version}}

---

{{callout}}

---

## Study Notes

*Add your notes here...*
`,

	// Strong's Concordance
	enableStrongs: true, // Enable by default for epic Bible study
	strongsDictionaryPath: 'Bible Portal/Bibles/BSB/strongs-dictionary.json',
	strongsTooltipMode: 'hover', // Hover for quick lookups
	strongsShowRelated: true, // Show related words
	strongsOriginalFontSize: 20, // Nice big font for Hebrew/Greek

	// Jesus Words
	enableJesusWords: true, // Enable red-letter text by default
	jesusWordsColor: '#dc2626', // Classic red-letter color (Tailwind red-600)
	jesusWordsShowMetadata: false, // Disabled to avoid conflict with Strong's tooltips
	showDisputedPassages: true, // Show disputed passage indicators by default
	showDisputedTooltips: true, // Show explanatory tooltips by default

	// Feature Toggles
	showCrossReferences: true, // Show cross-reference indicators by default
	showNoteIndicators: true, // Show note indicators by default
	showTagIndicators: true, // Show tag indicators by default

	// Theographic Metadata
	enableTheographic: true, // Enable Theographic features by default
	theographicDataPath: 'Bible Portal/Theographic',
	theographicShowPeople: true, // Show people in contextual sidebar
	theographicShowPlaces: true, // Show places in contextual sidebar
	theographicShowEvents: true, // Show events in contextual sidebar

	// Navigation
	homeVerse: 'John 3:16', // Default home verse
	showSecondaryNav: true, // Show secondary nav bar by default

	// Onboarding
	showOnboarding: true, // Show onboarding hints by default
	onboardingComplete: false, // New users haven't seen hints yet

	// Study Session Tracking
	enableSessionTracking: true, // Enable by default
	studyStreak: 0, // Start with no streak
	lastStudyDate: '', // No previous study

	// Reading Plans
	enableReadingPlan: false, // Disabled by default - user must opt in
	activeReadingPlans: [], // No plans selected (supports multiple)
	readingPlanStartDates: {}, // No start dates
	readingPlanProgress: {}, // No progress
	readingPlanMode: 'normal' as const, // Normal mode by default
	readingPlanReminder: true, // Show reminders by default
	customReadingPlans: [], // No custom plans

	// Annotation Layers (15G)
	annotationLayers: [
		{ id: 'personal', name: 'Personal', color: '#3b82f6', createdDate: new Date().toISOString(), isDefault: true },
		{ id: 'word-study', name: 'Word study', color: '#8b5cf6', createdDate: new Date().toISOString(), isDefault: true }
	],
	activeAnnotationLayer: 'personal', // Default to personal layer
	visibleAnnotationLayers: ['personal', 'word-study'], // All visible by default

	// Memorization Mode (15H)
	enableMemorization: true, // Enabled by default
	memorizationVerses: [], // No verses yet
	memorizationSettings: {
		newCardsPerDay: 5,
		reviewsPerDay: 20,
		showHints: true,
		autoAdvance: false
	},

	// Achievements
	enableAchievements: true, // Enabled by default
	unlockedAchievements: [], // No achievements unlocked yet
	achievementStats: { ...DEFAULT_ACHIEVEMENT_STATS }, // Start with default stats

	// Tags
	registeredTags: [], // Start with no registered tags

	// Smart Collections
	collections: [], // Start with no collections

	// Study Journal
	journalEntries: [], // Start with no journal entries

	// Study History
	studyHistory: {
		totalStudyMinutes: 0,
		bookVisits: {},
		chapterVisits: {},
		weeklyStats: []
	},

	// Context Sidebar (15C)
	showContextSidebar: false, // Hidden by default - user must opt in
	contextSidebarTab: 'commentary', // Default to commentary tab
	contextSidebarWidth: 350 // Default width in pixels
};

// Strong's Concordance data structures
interface StrongsWord {
	word: string; // English word
	number: string; // Strong's number (H1234 or G5678)
	position: number; // Word position in verse
}

interface StrongsVerse {
	text: string; // Verse text
	strongs: StrongsWord[]; // Array of word mappings to Strong's numbers
}

// Strong's Dictionary Entry (matches OpenScriptures data format)
interface StrongsGreekEntry {
	lemma: string; // Greek word in original characters (ἀγαπάω)
	translit: string; // Transliteration (agapáō)
	kjv_def: string; // KJV definition
	strongs_def: string; // Strong's full definition
	derivation: string; // Etymology/word origin
}

interface StrongsHebrewEntry {
	lemma: string; // Hebrew word in original characters (אָהַב)
	xlit: string; // Transliteration (ʼâhab)
	pron: string; // Pronunciation guide (aw-hab')
	kjv_def: string; // KJV definition
	strongs_def: string; // Strong's full definition
	derivation: string; // Etymology/word origin
}

interface StrongsDictionary {
	greek: { [number: string]: StrongsGreekEntry } | null;
	hebrew: { [number: string]: StrongsHebrewEntry } | null;
}

// Interlinear Bible data structure interfaces
interface InterlinearWord {
	i: number;           // word index in verse
	text: string;        // English translation
	word: string;        // Original Greek/Hebrew word
	number: string;      // Strong's number (lowercase: g#### or h####)
}

interface InterlinearVerse {
	verse: InterlinearWord[];
	id: string;          // Format: BBCCCVVVv (Book, Chapter, Verse)
}

type InterlinearBook = InterlinearVerse[];

interface InterlinearData {
	[bookName: string]: InterlinearBook | null;
}

// Jesus Words data structure - simplified format
// Just a simple array of verse references like ["Matthew 3:15", "Matthew 3:17", ...]
interface JesusWordsData {
	description: string;
	version: string;
	totalVerses: number;
	gospels: string[];
	verses: string[];
}

// Theographic Bible Metadata data structures
// Source: https://github.com/robertrouse/theographic-bible-metadata
// License: CC BY-SA 4.0

interface TheographicPerson {
	id: string; // Airtable record ID (e.g., "recv0dAY2ULzJ687g")
	createdTime: string; // ISO 8601 datetime
	fields: {
		personID: number; // Sequential ID (1, 2, 3...)
		personLookup: string; // Slug format (e.g., "aaron_1")
		name: string; // Display name (e.g., "Aaron")
		isProperName?: boolean;
		gender?: string; // "Male" | "Female"
		displayTitle?: string;
		status?: string; // "publish" | "wip"
		verseCount?: number; // Number of verses mentioning this person
		verses?: string[]; // Array of verse record IDs
		minYear?: number; // Birth year (negative = BCE)
		maxYear?: number; // Death year (negative = BCE)

		// Relationships (all are arrays of person record IDs)
		father?: string[];
		mother?: string[];
		siblings?: string[];
		children?: string[];
		partners?: string[]; // Spouses

		// References
		birthYear?: string[]; // Year record IDs
		deathYear?: string[]; // Year record IDs
		birthPlace?: string[]; // Place record IDs
		deathPlace?: string[]; // Place record IDs
		memberOf?: string[]; // People group record IDs

		// Dictionary/biographical data
		dictionaryLink?: string; // URL to external dictionary
		dictionaryText?: string; // Full biographical text
		dictText?: string[]; // Formatted biography array
		eastons?: string[]; // Easton's Dictionary record IDs

		modified?: string; // Last modified timestamp
	};
}

interface TheographicPlace {
	id: string;
	createdTime: string;
	fields: {
		placeID: number;
		placeLookup: string; // Slug format (e.g., "abana_1")
		displayTitle: string;
		slug: string;
		status?: string; // "publish" | "wip"
		alphaGroup?: string; // "A", "B", "C" etc for alphabetical grouping

		// Names in different translations
		kjvName?: string;
		esvName?: string;

		// Geographic coordinates
		latitude?: string; // Decimal format (e.g., "33.545097")
		longitude?: string; // Decimal format (e.g., "36.224661")
		openBibleLat?: string; // Alternative coordinates from OpenBible
		openBibleLong?: string;
		recogitoLat?: string; // Recogito coordinates
		recogitoLon?: string;
		recogitoUri?: string; // GeoNames URI
		recogitoStatus?: string; // "VERIFIED" | "UNVERIFIED"
		recogitoLabel?: string;
		recogitoUID?: string;

		// Place classification
		featureType?: string; // "City" | "Region" | "Water" | "Mountain" | "Landmark"
		featureSubType?: string; // "River", etc.
		precision?: string; // "Verified", etc.

		// References
		verseCount?: number;
		verses?: string[]; // Verse record IDs
		comment?: string; // Additional notes (e.g., "Now Barada River")

		// Dictionary data
		eastons?: string[]; // Easton's Dictionary record IDs
		dictText?: string[]; // Formatted description array

		modified?: string;
	};
}

interface TheographicEvent {
	id: string;
	createdTime: string;
	fields: {
		eventID: number;
		title: string; // Event name (e.g., "Creation of all things")
		startDate?: string; // Year as string (e.g., "-4003" for 4003 BCE)
		duration?: string; // Duration format (e.g., "7D", "930Y")
		sortKey?: number; // For chronological sorting
		verseSort?: string; // Verse reference format (e.g., "01001001")

		// Relationships
		participants?: string[]; // Person record IDs involved in event
		locations?: string[]; // Place record IDs where event occurred
		verses?: string[]; // Verse record IDs describing the event

		// Hierarchy
		partOf?: string[]; // Parent event record IDs
		predecessor?: string[]; // Previous event record IDs
		successor?: string[]; // Following event record IDs

		// Computed relationships
		'people (from verses)'?: string[]; // Flattened list of people

		modified?: string;
	};
}

interface TheographicPeriod {
	id: string;
	createdTime: string;
	fields: {
		yearNum: string; // Year as string (e.g., "-4004")
		isoYear: number; // Standardized year number (negative = BCE)
		'BC-AD': string; // "BC" | "AD"
		formattedYear: string; // Human-readable (e.g., "4004 BC")

		// References
		peopleBorn?: string[]; // Person record IDs born this year
		peopleDied?: string[]; // Person record IDs died this year
		events?: string; // Comma-separated event titles

		modified?: string;
	};
}

// Theographic verse entry
interface TheographicVerse {
	id: string; // Record ID
	createdTime: string;
	fields: {
		osisRef: string; // "Gen.1.1" format
		verseNum: string;
		verseText: string;
		verseID: string; // "01001001" format (book/chapter/verse)
		book?: string[]; // Book record IDs
		chapter?: string[]; // Chapter record IDs
		people?: string[]; // Person record IDs
		places?: string[]; // Place record IDs (if present)
		event?: string[]; // Event record IDs
		peopleCount?: number;
		placesCount?: number;
		yearNum?: number;
		status?: string;
		modified?: string;
	};
}

// Loaded Theographic data with indexes
interface TheographicData {
	people: TheographicPerson[] | null;
	places: TheographicPlace[] | null;
	events: TheographicEvent[] | null;
	periods: TheographicPeriod[] | null;
	verses: TheographicVerse[] | null; // Full verse dataset with metadata

	// Indexes for fast lookups
	peopleByVerse: Map<string, TheographicPerson[]> | null; // "Genesis:1:1" -> people
	placesByVerse: Map<string, TheographicPlace[]> | null;
	eventsByVerse: Map<string, TheographicEvent[]> | null;
	peopleById: Map<string, TheographicPerson> | null; // Record ID -> person
	placesById: Map<string, TheographicPlace> | null;
	eventsById: Map<string, TheographicEvent> | null;
	verseById: Map<string, TheographicVerse> | null; // Verse record ID -> verse

	loaded: boolean; // Track if data has been loaded
}

// Cross-Reference data structures
interface CrossReferenceEntry {
	v: string; // Verse reference (e.g., "GEN 1 1")
	r: { [key: string]: string }; // References (e.g., {"1": "EXO 20 11", "2": "JOB 38 4"})
}

interface CrossReferenceData {
	[verseRef: string]: string[]; // "Genesis 1:1" => ["Exodus 20:11", "Job 38:4", ...]
}

// Book abbreviation mapping (from cross-reference data to our canonical names)
// Includes both standard abbreviations and variants used by different cross-reference sources
const BOOK_ABBREVIATIONS: { [abbr: string]: string } = {
	'GEN': 'Genesis', 'EXO': 'Exodus', 'LEV': 'Leviticus', 'NUM': 'Numbers', 'DEU': 'Deuteronomy',
	'JOS': 'Joshua', 'JDG': 'Judges', 'RUT': 'Ruth', '1SA': '1 Samuel', '2SA': '2 Samuel',
	'1KI': '1 Kings', '2KI': '2 Kings', '1CH': '1 Chronicles', '2CH': '2 Chronicles',
	'EZR': 'Ezra', 'NEH': 'Nehemiah', 'EST': 'Esther', 'JOB': 'Job', 'PSA': 'Psalm',
	'PRO': 'Proverbs', 'ECC': 'Ecclesiastes', 'SNG': 'Song of Solomon', 'SOS': 'Song of Solomon', 'ISA': 'Isaiah',
	'JER': 'Jeremiah', 'LAM': 'Lamentations', 'EZK': 'Ezekiel', 'EZE': 'Ezekiel', 'DAN': 'Daniel',
	'HOS': 'Hosea', 'JOL': 'Joel', 'JOE': 'Joel', 'AMO': 'Amos', 'OBA': 'Obadiah', 'JON': 'Jonah',
	'MIC': 'Micah', 'NAM': 'Nahum', 'HAB': 'Habakkuk', 'ZEP': 'Zephaniah', 'HAG': 'Haggai',
	'ZEC': 'Zechariah', 'MAL': 'Malachi', 'MAT': 'Matthew', 'MRK': 'Mark', 'MAR': 'Mark', 'LUK': 'Luke',
	'JHN': 'John', 'JOH': 'John', 'ACT': 'Acts', 'ROM': 'Romans', '1CO': '1 Corinthians', '2CO': '2 Corinthians',
	'GAL': 'Galatians', 'EPH': 'Ephesians', 'PHP': 'Philippians', 'COL': 'Colossians',
	'1TH': '1 Thessalonians', '2TH': '2 Thessalonians', '1TI': '1 Timothy', '2TI': '2 Timothy',
	'TIT': 'Titus', 'PHM': 'Philemon', 'HEB': 'Hebrews', 'JAS': 'James', 'JAM': 'James', '1PE': '1 Peter',
	'2PE': '2 Peter', '1JN': '1 John', '1JO': '1 John', '2JN': '2 John', '2JO': '2 John', '3JN': '3 John', '3JO': '3 John',
	'JUD': 'Jude', 'JDE': 'Jude', 'REV': 'Revelation'
};

// Bible data structure interfaces
interface BibleVerse {
	[verseNumber: string]: string | StrongsVerse; // String for ESV/NIV, StrongsVerse for BSB
}

interface BibleChapter {
	verses: BibleVerse;
	headings?: { [verseNumber: string]: string }; // Optional section headings
}

interface BibleBook {
	chapters: {
		[chapterNumber: string]: BibleChapter;
	};
}

interface BibleData {
	version: string;
	books: {
		[bookName: string]: BibleBook;
	};
}

// View modes
enum ViewMode {
	CHAPTER = 'chapter',
	VERSE = 'verse',
	PASSAGE = 'passage',
	STRONGS = 'strongs',
	PEOPLE_INDEX = 'people-index',
	MAP_VIEW = 'map-view',
	TIMELINE_VIEW = 'timeline-view',
	NOTES_BROWSER = 'notes-browser',
	HIGHLIGHTS_BROWSER = 'highlights-browser',
	BOOKMARKS_BROWSER = 'bookmarks-browser',
	CONCORDANCE = 'concordance',
	TAGS_BROWSER = 'tags-browser',
	COLLECTIONS = 'collections',
	ACHIEVEMENTS = 'achievements',
	READING_PLAN = 'reading-plan',
	STUDY_JOURNAL = 'study-journal',
	STUDY_INSIGHTS = 'study-insights',
	COMPARISON_MATRIX = 'comparison-matrix',
	MEMORIZATION = 'memorization'
}

// View type constant
const VIEW_TYPE_BIBLE = "bible-portal-view";

// Toast notification helper
function showToast(message: string, duration: number = 3000) {
	const toast = document.createElement('div');
	toast.addClass('bible-toast');
	toast.textContent = message;
	document.body.appendChild(toast);

	// Trigger animation
	setTimeout(() => toast.addClass('bible-toast-show'), 10);

	// Remove after duration
	setTimeout(() => {
		toast.removeClass('bible-toast-show');
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

// Verse of the Day mapping structure
interface VOTDMapping {
	[dayOfYear: number]: {
		book: string;
		chapter: number;
		verse: number;
		text: string; // Verse text
		version: string; // Bible version
	};
}

// Performance caches
interface ChapterCache {
	version: string;
	book: string;
	chapter: number;
	data: BibleChapter;
	timestamp: number;
}

interface SearchIndex {
	version: string;
	index: Map<string, Array<{ book: string; chapter: number; verse: number; text: string }>>;
	timestamp: number;
}

// Book name mapping: Bible book name -> interlinear filename
// Bible data uses: "1 Samuel", "Psalm" (singular), "Song of Solomon"
// Interlinear files use: "i_samuel", "psalms" (plural), "song_of_solomon"
const INTERLINEAR_BOOK_MAPPING: { [key: string]: string } = {
	'Genesis': 'genesis',
	'Exodus': 'exodus',
	'Leviticus': 'leviticus',
	'Numbers': 'numbers',
	'Deuteronomy': 'deuteronomy',
	'Joshua': 'joshua',
	'Judges': 'judges',
	'Ruth': 'ruth',
	'1 Samuel': 'i_samuel',      // Bible uses numbers (1, 2, 3)
	'2 Samuel': 'ii_samuel',
	'1 Kings': 'i_kings',
	'2 Kings': 'ii_kings',
	'1 Chronicles': 'i_chronicles',
	'2 Chronicles': 'ii_chronicles',
	'Ezra': 'ezra',
	'Nehemiah': 'nehemiah',
	'Esther': 'esther',
	'Job': 'job',
	'Psalm': 'psalms',           // Bible uses singular, interlinear uses plural
	'Proverbs': 'proverbs',
	'Ecclesiastes': 'ecclesiastes',
	'Song of Solomon': 'song_of_solomon',
	'Isaiah': 'isaiah',
	'Jeremiah': 'jeremiah',
	'Lamentations': 'lamentations',
	'Ezekiel': 'ezekiel',
	'Daniel': 'daniel',
	'Hosea': 'hosea',
	'Joel': 'joel',
	'Amos': 'amos',
	'Obadiah': 'obadiah',
	'Jonah': 'jonah',
	'Micah': 'micah',
	'Nahum': 'nahum',
	'Habakkuk': 'habakkuk',
	'Zephaniah': 'zephaniah',
	'Haggai': 'haggai',
	'Zechariah': 'zechariah',
	'Malachi': 'malachi',
	'Matthew': 'matthew',
	'Mark': 'mark',
	'Luke': 'luke',
	'John': 'john',
	'Acts': 'acts',
	'Romans': 'romans',
	'1 Corinthians': 'i_corinthians',    // Bible uses numbers
	'2 Corinthians': 'ii_corinthians',
	'Galatians': 'galatians',
	'Ephesians': 'ephesians',
	'Philippians': 'philippians',
	'Colossians': 'colossians',
	'1 Thessalonians': 'i_thessalonians',
	'2 Thessalonians': 'ii_thessalonians',
	'1 Timothy': 'i_timothy',
	'2 Timothy': 'ii_timothy',
	'Titus': 'titus',
	'Philemon': 'philemon',
	'Hebrews': 'hebrews',
	'James': 'james',
	'1 Peter': 'i_peter',
	'2 Peter': 'ii_peter',
	'1 John': 'i_john',
	'2 John': 'ii_john',
	'3 John': 'iii_john',
	'Jude': 'jude',
	'Revelation': 'revelation'
};

// LRU Cache for interlinear verses
interface InterlinearCacheEntry {
	data: InterlinearWord[];
	timestamp: number;
	accessCount: number;
}

// Performance statistics
interface PerformanceStats {
	strongsLookups: number;
	interlinearLookups: number;
	cacheHits: number;
	cacheMisses: number;
	totalResponseTime: number; // milliseconds
	maxResponseTime: number; // milliseconds
	p95ResponseTime: number; // milliseconds (calculated from samples)
	responseTimes: number[]; // Last 100 response times for p95 calculation
}

// Main plugin class
export default class BiblePortalPlugin extends Plugin {
	settings: BiblePortalSettings;
	bibleVersions: Map<string, BibleData> = new Map(); // Multiple versions
	crossReferences: { [verse: string]: string[] } | null = null;
	highlights: Highlight[] = []; // User highlights
	noteReferences: NoteReference[] = []; // References to notes in vault
	bookmarks: Bookmark[] = []; // User bookmarks
	verseTags: VerseTag[] = []; // User verse tags (topics)
	concordanceData: ConcordanceData | null = null; // Word concordance (word -> verse references)
	votdMapping: VOTDMapping | null = null; // Verse of the Day mapping (365 days)
	strongsDictionary: StrongsDictionary | null = null; // Strong's Concordance lexicon (14,197 entries)
	interlinearData: InterlinearData = {}; // Interlinear Bible data (word-level Strong's mappings)
	jesusWordsData: JesusWordsData | null = null; // Jesus Words dataset (~937 red-letter verses across 4 Gospels)
	jesusWordsLookup: Set<string> = new Set(); // Fast lookup: "Matthew 3:15" format
	theographicData: TheographicData = {
		people: null,
		places: null,
		events: null,
		periods: null,
		verses: null,
		peopleByVerse: null,
		placesByVerse: null,
		eventsByVerse: null,
		peopleById: null,
		placesById: null,
		eventsById: null,
		verseById: null,
		loaded: false
	}; // Theographic Bible metadata (people, places, events, timeline)

	// Commentary data
	commentaryData: { [book: string]: { [chapter: string]: { [verseRange: string]: string } } } | null = null;
	commentaryMetadata: {
		title?: string;
		author?: string;
		year?: string;
		license?: string;
		source?: string;
	} | null = null;

	// Performance caches
	chapterCache: Map<string, ChapterCache> = new Map(); // Cache for frequently accessed chapters
	searchIndexes: Map<string, SearchIndex> = new Map(); // Search indexes per version
	interlinearCache: Map<string, InterlinearCacheEntry> = new Map(); // LRU cache for interlinear verses
	interlinearCacheMaxSize: number = 1000; // Max cached verses

	// Performance monitoring
	performanceStats: PerformanceStats = {
		strongsLookups: 0,
		interlinearLookups: 0,
		cacheHits: 0,
		cacheMisses: 0,
		totalResponseTime: 0,
		maxResponseTime: 0,
		p95ResponseTime: 0,
		responseTimes: []
	};
	maxCacheSize: number = 20; // Max cached chapters (tunable)

	// Status bar
	statusBarItem: HTMLElement | null = null;

	// Current study session
	currentSession: StudySession | null = null;
	isStudyModeActive: boolean = false;
	studyModeTimer: number | null = null; // Interval ID for updating timer display

	async onload() {
		// Load settings
		await this.loadSettings();

		// Load highlights and notes
		await this.loadHighlightsAndNotes();

		// Load cross-references (if available)
		await this.loadCrossReferences();

		// Load Strong's dictionaries (if available)
		await this.loadStrongsDictionaries();

		// Load Theographic Bible metadata (if available)
		await this.loadTheographicData();

		// Load concordance data (if available)
		await this.loadConcordanceData();

		// Load commentary data (if available)
		await this.loadCommentaryData();

		// Register the Bible view
		this.registerView(
			VIEW_TYPE_BIBLE,
			(leaf) => new BibleView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('book-open', 'Open Bible Portal', () => {
			this.activateBibleView();
		});

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.statusBarItem.addClass('bible-portal-status-bar');
		this.updateStatusBar('', 0); // Initialize empty

		// Study mode is now manual - don't auto-start
		// User toggles it with the Study Mode button

		// Add command to toggle study mode
		this.addCommand({
			id: 'toggle-study-mode',
			name: 'Toggle study mode',
			callback: () => {
				this.toggleStudyMode();
			}
		});

		// Add command to open Bible
		this.addCommand({
			id: 'open-bible-portal',
			name: 'Open Bible Portal',
			callback: () => {
				this.activateBibleView();
			}
		});

		// Add command to show performance statistics
		this.addCommand({
			id: 'show-performance-stats',
			name: "Strong's: Show performance statistics",
			callback: () => {
				const stats = this.getPerformanceStats();
				const cacheHitRate = stats.interlinearLookups > 0
					? ((stats.cacheHits / stats.interlinearLookups) * 100).toFixed(1)
					: '0';

				const avgResponseTime = stats.strongsLookups > 0
					? stats.totalResponseTime / stats.strongsLookups
					: 0;

				const message = [
					"📊 Strong's Concordance Performance Statistics:",
					'',
					`Total Strong's Lookups: ${stats.strongsLookups.toLocaleString()}`,
					`Interlinear Lookups: ${stats.interlinearLookups.toLocaleString()}`,
					`Cache Hits: ${stats.cacheHits.toLocaleString()} (${cacheHitRate}%)`,
					`Cache Misses: ${stats.cacheMisses.toLocaleString()}`,
					`Cache Size: ${this.interlinearCache.size} / ${this.interlinearCacheMaxSize} verses`,
					'',
					`⚡ Response Times:`,
					`  Average: ${avgResponseTime.toFixed(2)}ms`,
					`  p95: ${stats.p95ResponseTime.toFixed(2)}ms`,
					`  Max: ${stats.maxResponseTime.toFixed(2)}ms`,
					'',
					stats.p95ResponseTime < 50
						? '✓ Performance target met (<50ms p95)'
						: '⚠️ Performance target not met (>50ms p95)'
				].join('\n');

				console.debug(message);
				new Notice(message, 10000);
			}
		});

		// Add command to clear caches
		this.addCommand({
			id: 'clear-strongs-cache',
			name: "Strong's: Clear caches and reset stats",
			callback: () => {
				this.clearCaches();
				new Notice('✓ Strong\'s caches cleared and statistics reset', 4000);
			}
		});

		// TEMPORARILY DISABLED to isolate converter command registration issue
		// // Add keyboard shortcuts for quick highlighting (Colors 1-5)
		// this.settings.highlightColors.slice(0, 5).forEach((colorDef, index) => {
		// 	this.addCommand({
		// 		id: `highlight-color-${index + 1}`,
		// 		name: `Highlight with ${colorDef.name} (${index + 1})`,
		// 		hotkeys: [{ modifiers: ['Ctrl'], key: `${index + 1}` }],
		// 		checkCallback: (checking: boolean) => {
		// 			const view = this.app.workspace.getActiveViewOfType(BibleView);
		// 			if (view && view.currentBook && view.currentChapter) {
		// 				if (!checking) {
		// 					// Get the current verse (for simplicity, use verse 1 as default)
		// 					// TODO: In future, detect which verse is clicked/focused
		// 					showToast(`Use right-click menu to highlight specific verses with ${colorDef.name}`);
		// 				}
		// 				return true;
		// 			}
		// 			return false;
		// 		}
		// 	});
		// });

		// // Add keyboard shortcut for quick note creation
		// this.addCommand({
		// 	id: 'create-verse-note',
		// 	name: 'Create note for verse',
		// 	hotkeys: [{ modifiers: ['Ctrl'], key: 'n' }],
		// 	checkCallback: (checking: boolean) => {
		// 		const view = this.app.workspace.getActiveViewOfType(BibleView);
		// 		if (view && view.currentBook && view.currentChapter) {
		// 			if (!checking) {
		// 				showToast('Use right-click menu to create notes for specific verses');
		// 			}
		// 			return true;
		// 		}
		// 		return false;
		// 	}
		// });

		// Add settings tab
		this.addSettingTab(new BiblePortalSettingTab(this.app, this));

		// Load Bible data (non-blocking - errors won't prevent plugin from loading)
		try {
			await this.loadBibleData();

			// Build search indexes for all loaded versions
			for (const version of this.settings.bibleVersions) {
				if (this.bibleVersions.has(version)) {
					this.buildSearchIndex(version);
				}
			}
		} catch (error) {
			console.warn('[Bible Portal] Data loading failed - plugin will still work for conversion:', error);
		}

		// Load Verse of the Day mapping (non-blocking)
		try {
			await this.loadVOTDMapping();
		} catch (error) {
			console.warn('[Bible Portal] VOTD loading failed:', error);
		}

		// Note: Strong's dictionaries now loaded in onload() via loadStrongsDictionaries()

		// Load Jesus Words dataset (non-blocking)
		try {
			await this.loadJesusWords();
		} catch (error) {
			console.warn('[Bible Portal] Jesus Words loading failed:', error);
		}
	}

	onunload() {
		console.debug('Unloading Bible Portal plugin');

		// Save current study session to journal before unloading
		if (this.currentSession && this.settings.enableSessionTracking) {
			this.saveSessionToJournal();
		}
		// Note: Don't detach leaves in onunload - Obsidian handles this automatically
	}

	async activateBibleView() {
		console.debug('🚀 activateBibleView() called');
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_BIBLE);
		console.debug('📄 Existing Bible view leaves:', leaves.length);

		if (leaves.length > 0) {
			// A Bible view already exists, use it
			leaf = leaves[0];
		} else {
			// Create new leaf in center
			leaf = workspace.getLeaf('tab');
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_BIBLE,
					active: true,
				});
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Update the status bar with current Bible reference
	 */
	updateStatusBar(book: string, chapter: number, verse?: number) {
		if (!this.statusBarItem) return;

		if (!book || chapter <= 0) {
			this.statusBarItem.setText('');
			this.statusBarItem.style.display = 'none';
			return;
		}

		this.statusBarItem.style.display = '';
		const reference = verse
			? `📖 ${book} ${chapter}:${verse}`
			: `📖 ${book} ${chapter}`;
		this.statusBarItem.setText(reference);
	}

	/**
	 * Toggle study mode on/off
	 */
	toggleStudyMode() {
		if (this.isStudyModeActive) {
			this.endStudySession();
		} else {
			this.startStudySession();
		}
		// Refresh the view to update the button state
		this.app.workspace.getLeavesOfType(VIEW_TYPE_BIBLE).forEach(leaf => {
			if (leaf.view instanceof BibleView) {
				leaf.view.render();
			}
		});
	}

	/**
	 * Start a new study session
	 */
	startStudySession() {
		this.isStudyModeActive = true;
		this.currentSession = {
			startTime: Date.now(),
			versesRead: new Set(),
			notesCreated: 0,
			highlightsAdded: 0,
			chaptersVisited: new Set()
		};

		// Update streak
		const today = new Date().toISOString().split('T')[0];
		if (this.settings.lastStudyDate !== today) {
			const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
			if (this.settings.lastStudyDate === yesterday) {
				this.settings.studyStreak++;
			} else if (this.settings.lastStudyDate !== today) {
				this.settings.studyStreak = 1; // Reset streak
			}
			this.settings.lastStudyDate = today;
			void this.saveSettings();
		}

		// Start timer to update status bar every minute
		this.studyModeTimer = window.setInterval(() => {
			this.updateStudyModeStatusBar();
		}, 60000); // Update every minute

		// Initial status bar update
		this.updateStudyModeStatusBar();

		new Notice('📖 Study Mode started - tracking your session');
	}

	/**
	 * End the current study session and save stats
	 */
	endStudySession() {
		if (!this.currentSession || !this.isStudyModeActive) return;

		// Calculate duration
		const durationMinutes = Math.floor((Date.now() - this.currentSession.startTime) / 60000);

		// Update total study time in history
		if (!this.settings.studyHistory) {
			this.settings.studyHistory = {
				totalStudyMinutes: 0,
				bookVisits: {},
				chapterVisits: {},
				weeklyStats: []
			};
		}
		this.settings.studyHistory.totalStudyMinutes += durationMinutes;

		// Save session to journal
		const journalEntry: JournalEntry = {
			id: `session-${Date.now()}`,
			date: new Date().toISOString(),
			type: 'session',
			duration: durationMinutes,
			chaptersVisited: Array.from(this.currentSession.chaptersVisited),
			versesRead: this.currentSession.versesRead.size,
			notesCreated: this.currentSession.notesCreated,
			highlightsAdded: this.currentSession.highlightsAdded
		};

		if (!this.settings.journalEntries) {
			this.settings.journalEntries = [];
		}
		this.settings.journalEntries.push(journalEntry);

		// Clear timer
		if (this.studyModeTimer) {
			window.clearInterval(this.studyModeTimer);
			this.studyModeTimer = null;
		}

		// Reset state
		this.isStudyModeActive = false;
		this.currentSession = null;

		// Save settings
		void this.saveSettings();

		// Update status bar to normal
		this.updateStatusBar('', 0);

		new Notice(`📖 Study session ended - ${durationMinutes} min, ${journalEntry.chaptersVisited?.length || 0} chapters`);
	}

	/**
	 * Update status bar with study mode timer
	 */
	updateStudyModeStatusBar() {
		if (!this.statusBarItem || !this.currentSession || !this.isStudyModeActive) return;

		const minutes = Math.floor((Date.now() - this.currentSession.startTime) / 60000);
		const hours = Math.floor(minutes / 60);
		const mins = minutes % 60;

		const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
		const chapters = this.currentSession.chaptersVisited.size;

		this.statusBarItem.setText(`📖 Study: ${timeStr} | ${chapters} ch`);
		this.statusBarItem.style.display = '';
	}

	/**
	 * Track chapter visit in current session
	 */
	trackChapterVisit(book: string, chapter: number) {
		// Only track if study mode is active
		if (this.currentSession && this.isStudyModeActive) {
			const key = `${book} ${chapter}`;
			// Only count if not already visited this session
			if (!this.currentSession.chaptersVisited.has(key)) {
				this.currentSession.chaptersVisited.add(key);
				// Achievement tracking
				this.updateAchievementStat('totalChaptersRead');

				// Ensure studyHistory is initialized (for users with old settings)
				if (!this.settings.studyHistory) {
					this.settings.studyHistory = {
						totalStudyMinutes: 0,
						bookVisits: {},
						chapterVisits: {},
						weeklyStats: []
					};
				}
				if (!this.settings.studyHistory.bookVisits) {
					this.settings.studyHistory.bookVisits = {};
				}
				if (!this.settings.studyHistory.chapterVisits) {
					this.settings.studyHistory.chapterVisits = {};
				}

				// Study history tracking
				// Increment book visits
				this.settings.studyHistory.bookVisits[book] = (this.settings.studyHistory.bookVisits[book] || 0) + 1;
				// Increment chapter visits
				this.settings.studyHistory.chapterVisits[key] = (this.settings.studyHistory.chapterVisits[key] || 0) + 1;
				void this.saveSettings();
			}
		}
	}

	/**
	 * Track verse read in current session
	 */
	trackVerseRead(book: string, chapter: number, verse: number) {
		if (!this.currentSession || !this.isStudyModeActive) return;
		this.currentSession.versesRead.add(`${book} ${chapter}:${verse}`);
	}

	/**
	 * Track note creation in current session
	 */
	trackNoteCreated() {
		// Session tracking (only in study mode)
		if (this.currentSession && this.isStudyModeActive) {
			this.currentSession.notesCreated++;
		}
		// Achievement tracking (always)
		this.updateAchievementStat('totalNotesCreated');
	}

	/**
	 * Track highlight added in current session
	 */
	trackHighlightAdded() {
		// Session tracking (only in study mode)
		if (this.currentSession && this.isStudyModeActive) {
			this.currentSession.highlightsAdded++;
		}
		// Achievement tracking (always)
		this.updateAchievementStat('totalHighlightsAdded');
	}

	/**
	 * Get session statistics
	 */
	getSessionStats(): { duration: number; chapters: number; verses: number; notes: number; highlights: number; chaptersVisited: string[]; booksVisited: string[] } | null {
		if (!this.currentSession) return null;

		// Extract books from chapters visited (e.g., "Genesis 1" → "Genesis")
		const chaptersArray = Array.from(this.currentSession.chaptersVisited);
		const booksSet = new Set<string>();
		chaptersArray.forEach(ch => {
			const parts = ch.split(' ');
			if (parts.length >= 2) {
				// Handle books with spaces like "1 John", "Song of Solomon"
				booksSet.add(parts.slice(0, -1).join(' '));
			}
		});

		return {
			duration: Math.floor((Date.now() - this.currentSession.startTime) / 60000), // minutes
			chapters: this.currentSession.chaptersVisited.size,
			verses: this.currentSession.versesRead.size,
			notes: this.currentSession.notesCreated,
			highlights: this.currentSession.highlightsAdded,
			chaptersVisited: chaptersArray,
			booksVisited: Array.from(booksSet)
		};
	}

	/**
	 * Save current study session to journal
	 */
	saveSessionToJournal() {
		if (!this.currentSession) return;

		const stats = this.getSessionStats();
		if (!stats || stats.duration === 0) return; // Don't save 0-minute sessions

		const entry: JournalEntry = {
			id: `session-${Date.now()}`,
			date: new Date().toISOString(),
			type: 'session',
			duration: stats.duration,
			chaptersVisited: stats.chaptersVisited,
			versesRead: stats.verses,
			notesCreated: stats.notes,
			highlightsAdded: stats.highlights
		};

		this.settings.journalEntries.push(entry);
		void this.saveSettings();

		console.debug('Study session saved to journal:', entry);
	}

	/**
	 * Get all active reading plans
	 */
	getActiveReadingPlans(): ReadingPlan[] {
		if (!this.settings.enableReadingPlan || this.settings.activeReadingPlans.length === 0) return [];
		return READING_PLANS.filter(p => this.settings.activeReadingPlans.includes(p.id));
	}

	/**
	 * Get the first active reading plan (for backward compatibility)
	 */
	getCurrentReadingPlan(): ReadingPlan | null {
		const plans = this.getActiveReadingPlans();
		return plans.length > 0 ? plans[0] : null;
	}

	/**
	 * Get today's reading for a specific plan
	 */
	getTodaysReadingForPlan(planId: string): { plan: ReadingPlan; day: number; passages: string[]; completed: boolean; catchUpDay?: number } | null {
		const plan = READING_PLANS.find(p => p.id === planId);
		const startDate = this.settings.readingPlanStartDates[planId];
		if (!plan || !startDate) return null;

		// Calculate which day we're on based on calendar
		const start = new Date(startDate);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		start.setHours(0, 0, 0, 0);

		const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
		const calendarDay = Math.min(daysDiff + 1, plan.totalDays); // Day 1 starts on start date

		if (calendarDay < 1) return null;

		const progress = this.settings.readingPlanProgress[plan.id] || [];
		const mode = this.settings.readingPlanMode;

		// Skip-ahead mode: Jump to today's calendar day
		if (mode === 'skip-ahead') {
			const reading = plan.readings.find(r => r.day === calendarDay);
			if (!reading) return null;
			return {
				plan,
				day: calendarDay,
				passages: reading.passages,
				completed: progress.includes(calendarDay)
			};
		}

		// Find the first uncompleted reading
		const firstUncompleted = plan.readings.find(r => !progress.includes(r.day));

		// Catch-up mode: Show the first uncompleted reading (may be behind calendar)
		if (mode === 'catch-up' && firstUncompleted) {
			// If behind, show the catch-up reading
			if (firstUncompleted.day < calendarDay) {
				// Also include the current calendar day's passages for "double reading"
				const calendarReading = plan.readings.find(r => r.day === calendarDay);
				const allPassages = [...firstUncompleted.passages];
				if (calendarReading && calendarReading.day !== firstUncompleted.day) {
					allPassages.push(...calendarReading.passages);
				}
				return {
					plan,
					day: firstUncompleted.day,
					passages: allPassages,
					completed: false,
					catchUpDay: calendarReading ? calendarDay : undefined
				};
			}
		}

		// Normal mode: Show the reading for the first uncompleted day (not exceeding calendar)
		const targetDay = firstUncompleted ? Math.min(firstUncompleted.day, calendarDay) : calendarDay;
		const reading = plan.readings.find(r => r.day === targetDay);
		if (!reading) return null;

		return {
			plan,
			day: targetDay,
			passages: reading.passages,
			completed: progress.includes(targetDay)
		};
	}

	/**
	 * Get today's readings for all active plans
	 */
	getTodaysReadings(): Array<{ plan: ReadingPlan; day: number; passages: string[]; completed: boolean; catchUpDay?: number }> {
		const results: Array<{ plan: ReadingPlan; day: number; passages: string[]; completed: boolean; catchUpDay?: number }> = [];
		for (const planId of this.settings.activeReadingPlans) {
			const reading = this.getTodaysReadingForPlan(planId);
			if (reading) results.push(reading);
		}
		return results;
	}

	/**
	 * Get today's reading for the first active plan (backward compatibility)
	 */
	getTodaysReading(): { day: number; passages: string[]; completed: boolean; catchUpDay?: number } | null {
		const readings = this.getTodaysReadings();
		return readings.length > 0 ? readings[0] : null;
	}

	/**
	 * Mark a reading as complete for a specific plan
	 */
	async markReadingComplete(day: number, planId?: string) {
		const pid = planId || (this.settings.activeReadingPlans.length > 0 ? this.settings.activeReadingPlans[0] : null);
		if (!pid) return;

		if (!this.settings.readingPlanProgress[pid]) {
			this.settings.readingPlanProgress[pid] = [];
		}

		if (!this.settings.readingPlanProgress[pid].includes(day)) {
			this.settings.readingPlanProgress[pid].push(day);
			await this.saveSettings();
		}
	}

	/**
	 * Get reading plan progress percentage for a specific plan
	 */
	getReadingPlanProgress(planId?: string): number {
		const pid = planId || (this.settings.activeReadingPlans.length > 0 ? this.settings.activeReadingPlans[0] : null);
		if (!pid) return 0;

		const plan = READING_PLANS.find(p => p.id === pid);
		if (!plan) return 0;

		const progress = this.settings.readingPlanProgress[pid] || [];
		return Math.round((progress.length / plan.totalDays) * 100);
	}

	/**
	 * Toggle a reading plan on/off (add or remove from active plans)
	 */
	async toggleReadingPlan(planId: string): Promise<boolean> {
		const plan = READING_PLANS.find(p => p.id === planId);
		if (!plan) return false;

		const isActive = this.settings.activeReadingPlans.includes(planId);

		if (isActive) {
			// Remove from active plans
			this.settings.activeReadingPlans = this.settings.activeReadingPlans.filter(id => id !== planId);
			// Don't remove start date or progress - preserve for resuming
		} else {
			// Add to active plans
			this.settings.activeReadingPlans.push(planId);
			// Set start date if not already set (for resuming)
			if (!this.settings.readingPlanStartDates[planId]) {
				this.settings.readingPlanStartDates[planId] = new Date().toISOString().split('T')[0];
			}
		}

		this.settings.enableReadingPlan = this.settings.activeReadingPlans.length > 0;
		await this.saveSettings();
		return !isActive; // Return new state (true if now active)
	}

	/**
	 * Start a new reading plan (add to active plans)
	 */
	async startReadingPlan(planId: string) {
		const plan = READING_PLANS.find(p => p.id === planId);
		if (!plan) return;

		// Add to active plans if not already there
		if (!this.settings.activeReadingPlans.includes(planId)) {
			this.settings.activeReadingPlans.push(planId);
		}

		this.settings.enableReadingPlan = true;
		this.settings.readingPlanStartDates[planId] = new Date().toISOString().split('T')[0];
		// Don't reset progress - in case they're resuming
		await this.saveSettings();
	}

	/**
	 * Stop a reading plan (remove from active plans)
	 */
	async stopReadingPlan(planId: string) {
		this.settings.activeReadingPlans = this.settings.activeReadingPlans.filter(id => id !== planId);
		this.settings.enableReadingPlan = this.settings.activeReadingPlans.length > 0;
		await this.saveSettings();
	}

	/**
	 * Check and unlock any newly earned achievements
	 */
	async checkAchievements(): Promise<Achievement[]> {
		if (!this.settings.enableAchievements) return [];

		const newlyUnlocked: Achievement[] = [];

		for (const achievement of ACHIEVEMENTS) {
			// Skip if already unlocked
			if (this.settings.unlockedAchievements.includes(achievement.id)) continue;

			// Check if requirement is met
			if (achievement.requirement(this.settings.achievementStats, this.settings)) {
				this.settings.unlockedAchievements.push(achievement.id);
				newlyUnlocked.push(achievement);
			}
		}

		if (newlyUnlocked.length > 0) {
			await this.saveSettings();
		}

		return newlyUnlocked;
	}

	/**
	 * Update achievement stats and check for new achievements
	 */
	async updateAchievementStat(stat: keyof AchievementStats, value?: number | string) {
		if (!this.settings.enableAchievements) return;

		// Initialize stats if needed
		if (!this.settings.achievementStats) {
			this.settings.achievementStats = { ...DEFAULT_ACHIEVEMENT_STATS };
		}

		// Update the stat
		switch (stat) {
			case 'totalChaptersRead':
			case 'totalNotesCreated':
			case 'totalHighlightsAdded':
			case 'totalBookmarksAdded':
			case 'totalStudyMinutes':
				this.settings.achievementStats[stat] = (this.settings.achievementStats[stat] || 0) + 1;
				break;
			case 'longestStreak':
				if (this.settings.studyStreak > (this.settings.achievementStats.longestStreak || 0)) {
					this.settings.achievementStats.longestStreak = this.settings.studyStreak;
				}
				break;
			case 'booksCompleted':
				if (typeof value === 'string' && !this.settings.achievementStats.booksCompleted.includes(value)) {
					this.settings.achievementStats.booksCompleted.push(value);
				}
				break;
		}

		await this.saveSettings();

		// Check for new achievements
		const newAchievements = await this.checkAchievements();

		// Show notification for new achievements
		for (const achievement of newAchievements) {
			this.showAchievementNotification(achievement);
		}
	}

	/**
	 * Show achievement unlocked notification with celebration animation
	 */
	showAchievementNotification(achievement: Achievement) {
		const rarityColors: Record<string, string> = {
			common: '#9ca3af',
			uncommon: '#22c55e',
			rare: '#3b82f6',
			epic: '#a855f7',
			legendary: '#f59e0b'
		};

		const rarityEmojis: Record<string, string> = {
			common: '⭐',
			uncommon: '✨',
			rare: '💎',
			epic: '🌟',
			legendary: '👑'
		};

		const color = rarityColors[achievement.rarity] || '#9ca3af';
		const emoji = rarityEmojis[achievement.rarity] || '⭐';

		// Create celebration overlay
		const overlay = document.createElement('div');
		overlay.addClass('achievement-celebration-overlay');

		// Create confetti/sparkles
		const confettiContainer = document.createElement('div');
		confettiContainer.addClass('achievement-confetti');
		for (let i = 0; i < 30; i++) {
			const confetti = document.createElement('div');
			confetti.addClass('confetti-piece');
			confetti.style.setProperty('--x', `${Math.random() * 100}%`);
			confetti.style.setProperty('--delay', `${Math.random() * 0.5}s`);
			confetti.style.setProperty('--color', ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ff9ff3'][Math.floor(Math.random() * 6)]);
			confettiContainer.appendChild(confetti);
		}
		overlay.appendChild(confettiContainer);

		// Create notification card
		const card = document.createElement('div');
		card.addClass('achievement-celebration-card');
		card.addClass(`rarity-${achievement.rarity}`);
		card.style.setProperty('--rarity-color', color);

		// Header with "Achievement Unlocked!"
		const header = card.createDiv({ cls: 'achievement-celebration-header' });
		header.createSpan({ text: '🏆', cls: 'achievement-trophy' });
		header.createSpan({ text: 'Achievement unlocked!', cls: 'achievement-title' });

		// Icon with glow
		const iconContainer = card.createDiv({ cls: 'achievement-icon-container' });
		const iconEl = iconContainer.createDiv({ cls: 'achievement-icon-large' });
		setIcon(iconEl, achievement.icon);

		// Achievement name
		const nameEl = card.createDiv({ cls: 'achievement-name-large', text: achievement.name });

		// Description
		const descEl = card.createDiv({ cls: 'achievement-desc-large', text: achievement.description });

		// Rarity badge
		const rarityBadge = card.createDiv({ cls: `achievement-rarity-badge rarity-${achievement.rarity}` });
		rarityBadge.createSpan({ text: emoji });
		rarityBadge.createSpan({ text: achievement.rarity.toUpperCase() });

		overlay.appendChild(card);
		document.body.appendChild(overlay);

		// Auto-dismiss after 4 seconds, or click to dismiss
		const dismiss = () => {
			overlay.addClass('achievement-celebration-exit');
			setTimeout(() => overlay.remove(), 500);
		};

		overlay.addEventListener('click', dismiss);
		setTimeout(dismiss, 4000);
	}

	/**
	 * Get all achievements with their unlock status
	 */
	getAchievements(): { achievement: Achievement; unlocked: boolean }[] {
		return ACHIEVEMENTS.map(a => ({
			achievement: a,
			unlocked: this.settings.unlockedAchievements.includes(a.id)
		}));
	}

	/**
	 * Get achievement progress stats
	 */
	getAchievementProgress(): { unlocked: number; total: number; percentage: number } {
		const unlocked = this.settings.unlockedAchievements.length;
		const total = ACHIEVEMENTS.length;
		return {
			unlocked,
			total,
			percentage: Math.round((unlocked / total) * 100)
		};
	}

	async loadSettings() {
		const savedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

		// Migration: Convert old highlightGradient boolean to new highlightStyle
		if (savedData && 'highlightGradient' in savedData && !savedData.highlightStyle) {
			this.settings.highlightStyle = savedData.highlightGradient ? 'gradient' : 'solid';
			delete (this.settings as any).highlightGradient;
			await this.saveSettings();
		}
	}

	async saveSettings() {
		// Load existing data to preserve highlights, bookmarks, notes, tags
		const data = await this.loadData() || {};

		// Save settings while explicitly preserving data arrays
		const mergedData = {
			...this.settings,  // All settings
			highlights: data.highlights || [],  // Preserve highlights
			noteReferences: data.noteReferences || [],  // Preserve note refs
			bookmarks: data.bookmarks || [],  // Preserve bookmarks
			verseTags: data.verseTags || []  // Preserve tags
		};

		await this.saveData(mergedData);
	}

	/**
	 * Get the path to the plugin's bundled data folder
	 * This folder stores large datasets bundled with the plugin (cross-references, Strong's, interlinear, etc.)
	 * Uses configDir instead of hardcoded .obsidian for portability
	 */
	getPluginDataPath(): string {
		return `${this.app.vault.configDir}/plugins/${this.manifest.id}/data`;
	}

	/**
	 * Get the plugin's installation directory
	 */
	getPluginDir(): string {
		return `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
	}

	/**
	 * Read JSON file from plugin data folder
	 */
	async readPluginDataFile(filename: string): Promise<unknown | null> {
		try {
			const filePath = `${this.getPluginDataPath()}/${filename}`;
			const adapter = this.app.vault.adapter;

			const exists = await adapter.exists(filePath);
			if (!exists) {
				console.debug(`Plugin data file not found: ${filename}`);
				return null;
			}

			const content = await adapter.read(filePath);
			return JSON.parse(content);
		} catch (error) {
			console.error(`Error reading plugin data file ${filename}:`, error);
			return null;
		}
	}

	/**
	 * Write JSON file to plugin data folder
	 */
	async writePluginDataFile(filename: string, data: unknown): Promise<boolean> {
		try {
			const pluginDataPath = this.getPluginDataPath();
			const adapter = this.app.vault.adapter;

			// Ensure data folder exists
			const dataFolderExists = await adapter.exists(pluginDataPath);
			if (!dataFolderExists) {
				// @ts-ignore
				await adapter.mkdir(pluginDataPath);
			}

			// Handle nested directories (e.g., "commentaries/mhc/file.json")
			const filePath = `${pluginDataPath}/${filename}`;
			if (filename.includes('/')) {
				const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
				const dirExists = await adapter.exists(dirPath);
				if (!dirExists) {
					// Create nested directories recursively
					const parts = dirPath.split('/');
					let currentPath = '';
					for (const part of parts) {
						currentPath = currentPath ? `${currentPath}/${part}` : part;
						const partExists = await adapter.exists(currentPath);
						if (!partExists) {
							// @ts-ignore
							await adapter.mkdir(currentPath);
						}
					}
				}
			}

			const jsonContent = JSON.stringify(data, null, 2);
			await adapter.write(filePath, jsonContent);

			console.debug(`✓ Wrote plugin data file: ${filename}`);
			return true;
		} catch (error) {
			console.error(`Error writing plugin data file ${filename}:`, error);
			return false;
		}
	}

	async loadBibleData() {
		try {
			const adapter = this.app.vault.adapter;
			const discoveredVersions: string[] = [];

			// Hardcoded path in plugin folder
			const bibleDataFolder = `${this.getPluginDataPath()}/bibles`;

			// Check if folder exists using adapter (more reliable than vault cache)
			const folderExists = await adapter.exists(bibleDataFolder);

			if (!folderExists) {
				console.warn(`⚠️ Bible data folder does not exist: ${bibleDataFolder}`);
				// Clear Bible versions since folder doesn't exist
				this.bibleVersions.clear();
				this.settings.bibleVersions = [];
				return;
			}

			// List all files in the folder using adapter
			const files = await adapter.list(bibleDataFolder);

			// Process each JSON file
			for (const filePath of files.files) {
				if (filePath.endsWith('.json')) {
					const filename = filePath.split('/').pop() || '';
					const versionName = filename.replace('.json', '').toUpperCase();


					try {
						const bibleJson = await adapter.read(filePath);
						const bibleData = JSON.parse(bibleJson);
						this.bibleVersions.set(versionName, bibleData);
						discoveredVersions.push(versionName);
					} catch (error) {
						console.error(`❌ Failed to load ${versionName}:`, error);
					}
				}
			}

			// Update settings with discovered versions
			if (discoveredVersions.length > 0) {
				this.settings.bibleVersions = discoveredVersions;

				// Set default version to first discovered if not set or invalid
				if (!this.settings.defaultVersion || !discoveredVersions.includes(this.settings.defaultVersion)) {
					this.settings.defaultVersion = discoveredVersions[0];
					console.debug(`📌 Default version set to: ${this.settings.defaultVersion}`);
				}

				await this.saveSettings();
			} else {
				console.warn('⚠️ No Bible JSON files found in:', bibleDataFolder);
				// Clear Bible versions since no files found
				this.bibleVersions.clear();
				this.settings.bibleVersions = [];
			}

			// Cross-references are loaded separately via loadCrossReferences()

		} catch (error) {
			console.error('Error loading Bible data:', error);
			new Notice('Error loading Bible data. Check console for details.');
		}
	}

	/**
	 * Extract canonical book name from verbose API name
	 * Normalizes various book name formats to canonical names
	 */
	extractBookName(apiName: string): string {
		return this.normalizeBookName(apiName);
	}

	/**
	 * Normalize book name to canonical format
	 * Handles abbreviations and various naming conventions
	 */
	normalizeBookName(name: string): string {
		if (!name) return name;

		// Check if it's a 3-letter abbreviation
		const upper = name.toUpperCase().trim();
		if (BOOK_ABBREVIATIONS[upper]) {
			return BOOK_ABBREVIATIONS[upper];
		}

		// Already a full name, return as-is
		return name;
	}

	/**
	 * Strip HTML tags from text
	 */
	stripHtml(text: string): string {
		return text.replace(/<[^>]*>/g, '');
	}

	/**
	 * Download Bible translation from Bolls Life API
	 * @param onProgress Optional callback for progress updates (step, message, percent)
	 */
	async downloadBibleTranslation(onProgress?: (step: string, message: string, percent: number) => void) {
		try {
			// Step 1: Fetch available translations
			if (onProgress) onProgress('fetch', 'Fetching available translations...', 0);
			else new Notice('Fetching available translations...');

			const languagesUrl = 'https://bolls.life/static/bolls/app/views/languages.json';
			const languagesResponse = await requestUrl(languagesUrl);

			if (languagesResponse.status !== 200) {
				throw new Error(`Failed to fetch translations list: ${languagesResponse.status}`);
			}

			const languagesData = languagesResponse.json;

			// Flatten all translations from all languages, but ONLY keep English
			const allTranslations: Array<{short_name: string, full_name: string, language: string}> = [];
			languagesData.forEach((lang: any) => {
				// Only include English translations
				if (lang.language === 'English') {
					lang.translations.forEach((trans: any) => {
						allTranslations.push({
							short_name: trans.short_name,
							full_name: trans.full_name,
							language: lang.language
						});
					});
				}
			});

			// Sort by short name
			allTranslations.sort((a, b) => a.short_name.localeCompare(b.short_name));

			// Step 2: Show selection modal (English only)
			const selectedTranslation = await this.showTranslationPicker(allTranslations);

			if (!selectedTranslation) {
				new Notice('Download cancelled');
				return;
			}

			const versionCode = selectedTranslation.short_name;

			// Step 3: Fetch books list
			if (onProgress) onProgress('books', `Downloading ${versionCode}... Fetching book list`, 5);
			else new Notice(`Downloading ${versionCode}... (Step 1/2: Fetching book list)`);

			const booksUrl = `https://bolls.life/get-books/${versionCode}/`;
			const booksResponse = await requestUrl(booksUrl);

			if (booksResponse.status !== 200) {
				throw new Error(`Failed to fetch books for ${versionCode}: ${booksResponse.status}`);
			}

			const booksData = booksResponse.json;

			// Step 4: Download all chapters for all books (IN PARALLEL)
			if (onProgress) onProgress('chapters', `Downloading ${versionCode}... Preparing ${booksData.length} books`, 10);
			else new Notice(`Downloading ${versionCode}... (Step 2/2: Downloading ${booksData.length} books)`);

			const bibleData: any = {
				version: versionCode,
				books: {}
			};

			// Initialize book structure first (with canonical names)
			const bookNameMap: {[apiName: string]: string} = {};
			for (const book of booksData) {
				const canonicalName = this.extractBookName(book.name);
				bookNameMap[book.name] = canonicalName;
				bibleData.books[canonicalName] = {
					chapters: {}
				};
			}

			// Build array of all chapter download promises
			const chapterPromises: Promise<any>[] = [];

			// Calculate total chapters for progress tracking
			let totalChapterCount = 0;
			for (const book of booksData) {
				totalChapterCount += book.chapters;
			}
			let completedChapters = 0;

			for (const book of booksData) {
				const bookId = book.bookid;
				const apiBookName = book.name;
				const bookName = bookNameMap[apiBookName];
				const numChapters = book.chapters;

				for (let chapterNum = 1; chapterNum <= numChapters; chapterNum++) {
					const chapterUrl = `https://bolls.life/get-chapter/${versionCode}/${String(bookId).padStart(2, '0')}/${chapterNum}/`;

					// Create promise for this chapter download
					const chapterPromise = requestUrl(chapterUrl)
						.then(response => {
							// Track progress
							completedChapters++;
							if (onProgress) {
								const percent = Math.round(10 + (completedChapters / totalChapterCount) * 80); // 10-90% range
								onProgress('download', `Downloading ${versionCode}... ${completedChapters}/${totalChapterCount} chapters`, percent);
							}

							if (response.status !== 200) {
								console.warn(`Failed to fetch ${bookName} ${chapterNum}: ${response.status}`);
								return null;
							}

							const versesData = response.json;

							// Convert verses array to our format (strip HTML tags)
							const verses: any = {};
							versesData.forEach((verseObj: any) => {
								verses[verseObj.verse.toString()] = this.stripHtml(verseObj.text);
							});

							return {
								bookName,
								chapterNum: chapterNum.toString(),
								verses
							};
						})
						.catch(error => {
							completedChapters++;
							console.error(`Error downloading ${bookName} ${chapterNum}:`, error);
							return null;
						});

					chapterPromises.push(chapterPromise);
				}
			}

			// Download ALL chapters in parallel
			if (!onProgress) new Notice(`Downloading ${chapterPromises.length} chapters in parallel...`);
			const chapterResults = await Promise.all(chapterPromises);

			// Populate bibleData with results
			let totalChapters = 0;
			let totalVerses = 0;

			chapterResults.forEach(result => {
				if (result) {
					bibleData.books[result.bookName].chapters[result.chapterNum] = {
						verses: result.verses
					};
					totalChapters++;
					totalVerses += Object.keys(result.verses).length;
				}
			});

			// Step 5: Save to plugin data folder
			if (onProgress) onProgress('save', `Saving ${versionCode}...`, 95);

			const bibleDataFolder = `${this.getPluginDataPath()}/bibles`;
			const outputPath = `${bibleDataFolder}/${versionCode.toLowerCase()}.json`;
			const jsonContent = JSON.stringify(bibleData, null, 2);

			// Ensure the folder exists before writing
			const adapter = this.app.vault.adapter;
			if (!(await adapter.exists(bibleDataFolder))) {
				await adapter.mkdir(bibleDataFolder);
			}

			await adapter.write(outputPath, jsonContent);

			// Step 6: Success!
			const successMsg = `✓ ${versionCode} downloaded successfully! ${booksData.length} books, ${totalChapters} chapters, ${totalVerses} verses`;
			if (onProgress) onProgress('complete', successMsg, 100);
			else new Notice(successMsg + `\nSaved to: ${outputPath}`, 8000);

			// Reload Bible data to include new version
			await this.loadBibleData();

		} catch (error) {
			console.error('Bible download error:', error);
			if (onProgress) onProgress('error', `Download failed: ${error.message}`, -1);
			else new Notice(`❌ Download failed: ${error.message}`, 8000);
		}
	}

	/**
	 * Show translation picker modal
	 */
	async showTranslationPicker(translations: Array<{short_name: string, full_name: string, language: string}>): Promise<{short_name: string, full_name: string} | null> {
		return new Promise((resolve) => {
			let selectedTranslation: {short_name: string, full_name: string} | null = null;

			const modal = new Modal(this.app);
			modal.titleEl.setText('Select Bible Translation');

			const contentEl = modal.contentEl;
			contentEl.empty();

			// Search box
			const searchDiv = contentEl.createDiv({ cls: 'bible-download-search' });
			const searchInput = searchDiv.createEl('input', {
				type: 'text',
				placeholder: 'Search translations...',
				cls: 'bible-download-search-input'
			});

			// Translations list
			const listDiv = contentEl.createDiv({ cls: 'bible-download-list' });

			const renderList = (filter: string = '') => {
				listDiv.empty();

				const filtered = filter
					? translations.filter(t =>
						t.short_name.toLowerCase().includes(filter.toLowerCase()) ||
						t.full_name.toLowerCase().includes(filter.toLowerCase()) ||
						t.language.toLowerCase().includes(filter.toLowerCase())
					)
					: translations;

				if (filtered.length === 0) {
					listDiv.createEl('p', { text: 'No translations found', cls: 'bible-download-empty' });
					return;
				}

				filtered.forEach(trans => {
					const item = listDiv.createDiv({ cls: 'bible-download-item' });

					const titleDiv = item.createDiv({ cls: 'bible-download-item-title' });
					titleDiv.createEl('strong', { text: trans.short_name });
					titleDiv.createEl('span', { text: ` - ${trans.full_name}` });

					item.createDiv({
						text: trans.language,
						cls: 'bible-download-item-lang'
					});

					item.addEventListener('click', () => {
						selectedTranslation = trans;
						modal.close();
					});
				});
			};

			// Initial render
			renderList();

			// Search handler
			searchInput.addEventListener('input', () => {
				renderList(searchInput.value);
			});

			// Close handler - resolve with selected translation or null
			modal.onClose = () => {
				resolve(selectedTranslation);
			};

			modal.open();
			searchInput.focus();
		});
	}

	// Data repository base URL
	private readonly DATA_REPO_URL = 'https://raw.githubusercontent.com/pctech777/bible-portal-data/main';

	/**
	 * Download cross-reference data from GitHub
	 */
	async downloadCrossReferences() {
		const modal = new DownloadProgressModal(this.app, 'Downloading cross-references');
		modal.open();

		try {
			modal.setStatus('Downloading cross-reference data (~12 MB)...');
			modal.setProgress(10);

			const url = `${this.DATA_REPO_URL}/cross-references.json`;
			const response = await requestUrl(url);

			modal.setProgress(50);

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}`);
			}

			const crossRefs = response.json;

			if (!crossRefs || !Array.isArray(crossRefs)) {
				throw new Error('Invalid cross-reference data format');
			}

			console.debug(`Downloaded ${crossRefs.length} cross-reference entries`);

			modal.setStatus('Saving cross-references...');
			modal.setProgress(70);

			// Save to plugin data folder
			const success = await this.writePluginDataFile('cross-references.json', crossRefs);

			if (!success) {
				modal.setError('Failed to save cross-references');
				return;
			}

			modal.setStatus('Loading into memory...');
			modal.setProgress(90);

			// Load into memory
			await this.loadCrossReferences();

			modal.setComplete(`✓ Downloaded ${crossRefs.length.toLocaleString()} cross-references`);

		} catch (error) {
			console.error('Cross-reference download error:', error);
			modal.setError(`Download failed: ${error.message}`);
		}
	}

	/**
	 * Load cross-references from plugin data into memory
	 */
	async loadCrossReferences() {
		try {
			// Load cross-references from plugin data folder
			const fileData = await this.readPluginDataFile('cross-references.json');
			if (!fileData || !Array.isArray(fileData)) {
				console.debug('ℹ️ Cross-references not downloaded yet');
				this.crossReferences = null;
				return;
			}

			const crossRefEntries: CrossReferenceEntry[] = fileData;

			// Convert from abbreviated format to our format
			const mergedData: CrossReferenceData = {};

			for (const entry of crossRefEntries) {
				// Skip invalid entries
				if (!entry || !entry.v || !entry.r) continue;

				// Parse verse reference: "GEN 1 1" → "Genesis 1:1"
				const parts = entry.v.split(' ');
				if (parts.length !== 3) continue;

				const bookAbbr = parts[0];
				const chapter = parts[1];
				const verse = parts[2];

				const bookName = BOOK_ABBREVIATIONS[bookAbbr];
				if (!bookName) continue;

				const verseRef = `${bookName} ${chapter}:${verse}`;

				// Convert references from abbreviated format
				const references: string[] = [];
				for (const refValue of Object.values(entry.r)) {
					const refParts = refValue.split(' ');
					if (refParts.length !== 3) continue;

					const refBookAbbr = refParts[0];
					const refChapter = refParts[1];
					const refVerse = refParts[2];

					const refBookName = BOOK_ABBREVIATIONS[refBookAbbr];
					if (!refBookName) continue;

					references.push(`${refBookName} ${refChapter}:${refVerse}`);
				}

				mergedData[verseRef] = references;
			}

			this.crossReferences = mergedData;

			const verseCount = Object.keys(mergedData).length;
			console.debug(`✓ Cross-references loaded: ${verseCount.toLocaleString()} verses`);

		} catch (error) {
			console.error('Error loading cross-references:', error);
			this.crossReferences = null;
		}
	}

	/**
	 * Get cross-references for a verse
	 */
	getCrossReferences(book: string, chapter: number, verse: number): string[] {
		if (!this.crossReferences) return [];

		// Normalize book name to match cross-reference data format
		const normalizedBook = this.normalizeBookName(book);
		const verseRef = `${normalizedBook} ${chapter}:${verse}`;
		return this.crossReferences[verseRef] || [];
	}

	/**
	 * Load concordance data from plugin data folder
	 */
	async loadConcordanceData() {
		try {
			// Try to load concordance for default version
			const version = this.settings.defaultVersion.toLowerCase();
			const filename = `concordance-${version}.json`;
			const data = await this.readPluginDataFile(filename) as ConcordanceData | null;

			if (!data || !data.words) {
				console.debug('ℹ️ No concordance data found');
				this.concordanceData = null;
				return;
			}

			this.concordanceData = data as ConcordanceData;
			console.debug(`✓ Concordance loaded: ${this.concordanceData.stats.uniqueWords.toLocaleString()} words`);

		} catch (error) {
			console.error('Error loading concordance:', error);
			this.concordanceData = null;
		}
	}

	/**
	 * Search concordance for a word
	 */
	searchConcordance(word: string): ConcordanceReference[] {
		if (!this.concordanceData) return [];
		const normalized = word.toLowerCase().trim();
		return this.concordanceData.words[normalized] || [];
	}

	/**
	 * Get all words starting with a letter
	 */
	getConcordanceWordsForLetter(letter: string): string[] {
		if (!this.concordanceData) return [];
		const lowerLetter = letter.toLowerCase();
		return Object.keys(this.concordanceData.words)
			.filter(word => word.startsWith(lowerLetter))
			.sort();
	}

	/**
	 * Build concordance from loaded Bible data
	 * @param onProgress - Optional callback for progress updates (bookName, bookIndex, totalBooks)
	 */
	async buildConcordanceFromBible(onProgress?: (book: string, current: number, total: number) => void): Promise<boolean> {
		try {
			const version = this.settings.defaultVersion;
			const bible = this.getBibleData(version);
			if (!bible) {
				new Notice('No Bible data loaded to build concordance from');
				return false;
			}

			const words: Record<string, ConcordanceReference[]> = {};
			let totalVerses = 0;
			let totalWords = 0;

			const bookEntries = Object.entries(bible.books);
			const totalBooks = bookEntries.length;

			// Process all books with progress updates
			for (let bookIndex = 0; bookIndex < bookEntries.length; bookIndex++) {
				const [bookName, bookData] = bookEntries[bookIndex];

				// Report progress
				if (onProgress) {
					onProgress(bookName, bookIndex + 1, totalBooks);
				}

				// Yield to UI thread every few books
				if (bookIndex % 5 === 0) {
					await new Promise(resolve => setTimeout(resolve, 0));
				}

				for (const [chapterNum, chapterData] of Object.entries(bookData.chapters)) {
					for (const [verseNum, verseData] of Object.entries(chapterData.verses)) {
						totalVerses++;
						const text = typeof verseData === 'string' ? verseData : verseData.text;

						// Extract words (remove punctuation, lowercase)
						const verseWords = text.toLowerCase()
							.replace(/[^\w\s'-]/g, ' ')
							.split(/\s+/)
							.filter(w => w.length > 1 && !/^\d+$/.test(w));

						for (const word of verseWords) {
							totalWords++;
							if (!words[word]) {
								words[word] = [];
							}
							// Only add if this verse isn't already recorded for this word
							const chapterInt = parseInt(chapterNum);
							const verseInt = parseInt(verseNum);
							if (!words[word].some(r => r.book === bookName && r.chapter === chapterInt && r.verse === verseInt)) {
								words[word].push({
									book: bookName,
									chapter: chapterInt,
									verse: verseInt
								});
							}
						}
					}
				}
			}

			const uniqueWords = Object.keys(words).length;

			this.concordanceData = {
				version,
				generated: true,
				words,
				stats: {
					uniqueWords,
					totalVerses,
					totalWords
				}
			};

			// Save to file for faster loading next time
			const filename = `concordance-${version.toLowerCase()}.json`;
			await this.writePluginDataFile(filename, this.concordanceData);

			new Notice(`Concordance built: ${uniqueWords.toLocaleString()} unique words from ${totalVerses.toLocaleString()} verses`);
			return true;
		} catch (error) {
			console.error('Error building concordance:', error);
			new Notice('Failed to build concordance');
			return false;
		}
	}

	/**
	 * Load commentary data from plugin data folder
	 */
	async loadCommentaryData() {
		try {
			// Try to load Matthew Henry's Concise Commentary
			type CommentaryData = { [book: string]: { [chapter: string]: { [verseRange: string]: string } } };
			type CommentaryMetadata = { title?: string; author?: string; year?: string; license?: string; source?: string };
			const data = await this.readPluginDataFile('commentaries/mhc/matthew_henry_concise.json') as CommentaryData | null;

			if (!data) {
				console.debug('ℹ️ No commentary data found - can be downloaded from settings or Commentary tab');
				this.commentaryData = null;
				this.commentaryMetadata = null;
				return;
			}

			this.commentaryData = data;

			// Try to load metadata
			const metadata = await this.readPluginDataFile('commentaries/mhc/metadata.json') as CommentaryMetadata | null;
			if (metadata) {
				this.commentaryMetadata = metadata;
			}

			const bookCount = Object.keys(data).length;
			let chapterCount = 0;
			for (const book of Object.values(data)) {
				chapterCount += Object.keys(book).length;
			}
			console.debug(`✓ Commentary loaded: ${bookCount} books, ${chapterCount} chapters`);

		} catch (error) {
			console.error('Error loading commentary data:', error);
			this.commentaryData = null;
			this.commentaryMetadata = null;
		}
	}

	/**
	 * Download Matthew Henry's Concise Commentary from GitHub
	 */
	async downloadCommentaryData() {
		const modal = new DownloadProgressModal(this.app, 'Downloading commentary');
		modal.open();

		try {
			modal.setStatus('Downloading Matthew Henry\'s Commentary (~3.6 MB)...');
			modal.setProgress(10);

			const url = `${this.DATA_REPO_URL}/commentaries/matthew_henry_concise.json`;
			const response = await requestUrl(url);

			modal.setProgress(50);

			if (response.status !== 200) {
				throw new Error(`HTTP ${response.status}`);
			}

			const commentaryData = response.json;

			if (!commentaryData || typeof commentaryData !== 'object') {
				throw new Error('Invalid commentary data format');
			}

			const bookCount = Object.keys(commentaryData).length;
			console.debug(`Downloaded commentary with ${bookCount} books`);

			modal.setStatus('Saving commentary data...');
			modal.setProgress(70);

			// Ensure commentaries folder exists and save
			const success = await this.writePluginDataFile('commentaries/mhc/matthew_henry_concise.json', commentaryData);

			if (!success) {
				modal.setError('Failed to save commentary data');
				return;
			}

			modal.setProgress(90);

			// Create metadata
			const metadata = {
				title: "Matthew Henry's Concise Commentary on the Whole Bible",
				author: "Matthew Henry",
				year: "1706",
				license: "Public Domain",
				source: "Bible Portal Data Repository",
				books: bookCount
			};
			await this.writePluginDataFile('commentaries/mhc/metadata.json', metadata);

			// Load into memory
			await this.loadCommentaryData();

			modal.setComplete(`✓ Downloaded commentary (${bookCount} books)`);

		} catch (error) {
			console.error('Commentary download error:', error);
			modal.setError(`Download failed: ${error.message}`);
		}
	}

	/**
	 * Get commentary for a specific chapter
	 */
	getCommentaryForChapter(book: string, chapter: number): { [verseRange: string]: string } | null {
		if (!this.commentaryData) return null;

		// Try exact match
		let bookData = this.commentaryData[book];

		// Try case-insensitive match
		if (!bookData) {
			const normalizedBook = book.toLowerCase();
			for (const [key, value] of Object.entries(this.commentaryData)) {
				if (key.toLowerCase() === normalizedBook) {
					bookData = value;
					break;
				}
			}
		}

		if (!bookData) return null;

		return bookData[String(chapter)] || null;
	}

	/**
	 * Load Strong's dictionaries from plugin data folder
	 */
	async loadStrongsDictionaries() {
		try {
			type GreekDict = { [number: string]: StrongsGreekEntry };
			type HebrewDict = { [number: string]: StrongsHebrewEntry };
			// Load Greek dictionary
			const greekData = await this.readPluginDataFile('strongs-greek.json') as GreekDict | null;
			// Load Hebrew dictionary
			const hebrewData = await this.readPluginDataFile('strongs-hebrew.json') as HebrewDict | null;

			if (!greekData && !hebrewData) {
				console.debug('ℹ️ No Strong\'s dictionaries found');
				this.strongsDictionary = null;
				return;
			}

			this.strongsDictionary = {
				greek: greekData,
				hebrew: hebrewData
			};

			const greekCount = greekData ? Object.keys(greekData).length : 0;
			const hebrewCount = hebrewData ? Object.keys(hebrewData).length : 0;
			console.debug(`✓ Strong's dictionaries loaded: ${greekCount.toLocaleString()} Greek + ${hebrewCount.toLocaleString()} Hebrew entries`);

		} catch (error) {
			console.error('Error loading Strong\'s dictionaries:', error);
			this.strongsDictionary = null;
		}
	}

	/**
	 * Download Strong's dictionaries and interlinear data from GitHub
	 */
	async downloadStrongsDictionaries() {
		const modal = new DownloadProgressModal(this.app, "Downloading Strong's Concordance & Interlinear Data");
		modal.open();

		try {
			// Step 1: Download Greek dictionary (10%)
			modal.setStatus('Downloading Greek dictionary (~1.2 MB)...');
			modal.setProgress(5);

			const greekUrl = `${this.DATA_REPO_URL}/strongs/strongs-greek.json`;
			const hebrewUrl = `${this.DATA_REPO_URL}/strongs/strongs-hebrew.json`;

			const greekResponse = await requestUrl(greekUrl);
			if (greekResponse.status !== 200) {
				modal.setError('Failed to download Greek dictionary');
				return;
			}

			// Step 2: Download Hebrew dictionary (20%)
			modal.setStatus('Downloading Hebrew dictionary (~2 MB)...');
			modal.setProgress(15);

			const hebrewResponse = await requestUrl(hebrewUrl);
			if (hebrewResponse.status !== 200) {
				modal.setError('Failed to download Hebrew dictionary');
				return;
			}

			// Step 3: Save dictionaries (25%)
			modal.setStatus('Saving dictionaries...');
			modal.setProgress(20);

			const greekData = greekResponse.json;
			const hebrewData = hebrewResponse.json;

			await this.writePluginDataFile('strongs-greek.json', greekData);
			await this.writePluginDataFile('strongs-hebrew.json', hebrewData);

			const greekCount = Object.keys(greekData).length;
			const hebrewCount = Object.keys(hebrewData).length;

			// Load dictionaries into memory
			await this.loadStrongsDictionaries();

			// Step 4: Download interlinear data (25% - 95%)
			modal.setStatus('Downloading interlinear data (66 books)...');

			const interlinearFiles = Object.values(INTERLINEAR_BOOK_MAPPING);
			const totalFiles = interlinearFiles.length;
			let downloadedFiles = 0;
			let failedFiles: string[] = [];

			for (const filename of interlinearFiles) {
				const url = `${this.DATA_REPO_URL}/interlinear/${filename}.json`;
				try {
					const response = await requestUrl(url);
					if (response.status === 200) {
						await this.writePluginDataFile(`interlinear/${filename}.json`, response.json);
						downloadedFiles++;
					} else {
						failedFiles.push(filename);
					}
				} catch (e) {
					failedFiles.push(filename);
				}

				// Update progress (25% to 95% range for interlinear)
				const interlinearProgress = 25 + (downloadedFiles / totalFiles) * 70;
				modal.setProgress(Math.round(interlinearProgress));
				modal.setStatus(`Downloading interlinear: ${downloadedFiles}/${totalFiles} books...`);
			}

			// Clear interlinear cache so new data is used
			this.interlinearData = {};
			this.interlinearCache.clear();

			// Step 5: Complete
			if (failedFiles.length === 0) {
				modal.setComplete(`✓ Downloaded ${greekCount.toLocaleString()} Greek + ${hebrewCount.toLocaleString()} Hebrew entries\n✓ Downloaded ${downloadedFiles} interlinear books`);
			} else {
				modal.setComplete(`✓ Downloaded dictionaries + ${downloadedFiles}/${totalFiles} interlinear books\n⚠️ Failed: ${failedFiles.slice(0, 5).join(', ')}${failedFiles.length > 5 ? '...' : ''}`);
			}

		} catch (error) {
			console.error('Strong\'s download error:', error);
			modal.setError(`Download failed: ${error.message}`);
		}
	}

	/**
	 * Download Theographic metadata from GitHub
	 */
	async downloadTheographicData() {
		const modal = new DownloadProgressModal(this.app, 'Downloading Theographic Data');
		modal.open();

		try {
			const files = [
				{ path: 'theographic/people.json', name: 'People (~8 MB)' },
				{ path: 'theographic/places.json', name: 'Places (~3 MB)' },
				{ path: 'theographic/events.json', name: 'Events (~2 MB)' },
				{ path: 'theographic/periods.json', name: 'Periods' },
				{ path: 'theographic/verses.json', name: 'Verse mappings (~30 MB)' }
			];

			let successCount = 0;

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const progress = Math.round(((i + 0.5) / files.length) * 80) + 10;
				modal.setStatus(`Downloading ${file.name}...`);
				modal.setProgress(progress);

				try {
					const url = `${this.DATA_REPO_URL}/${file.path}`;
					const response = await requestUrl(url);
					if (response.status !== 200) {
						console.error(`Failed to download ${file.path}: HTTP ${response.status}`);
						continue;
					}

					const data = response.json;
					const success = await this.writePluginDataFile(file.path, data);
					if (success) {
						successCount++;
						console.debug(`✓ Downloaded ${file.path}`);
					}
				} catch (error) {
					console.error(`Error downloading ${file.path}:`, error);
				}
			}

			if (successCount === 0) {
				modal.setError('Failed to download Theographic metadata');
				return;
			}

			modal.setStatus('Loading data into memory...');
			modal.setProgress(95);

			// Load into memory
			await this.loadTheographicData();

			if (successCount === files.length) {
				modal.setComplete(`✓ Downloaded all ${successCount} Theographic files`);
			} else {
				modal.setComplete(`⚠️ Downloaded ${successCount}/${files.length} files`);
			}

		} catch (error) {
			console.error('Theographic download error:', error);
			modal.setError(`Download failed: ${error.message}`);
		}
	}

	/**
	 * Load Theographic Bible metadata (people, places, events, periods)
	 * Lazy loading with indexing for fast verse lookups
	 */
	async loadTheographicData() {
		if (!this.settings.enableTheographic) {
			console.debug('ℹ️ Theographic features disabled in settings');
			return;
		}

		try {
			console.debug('Loading Theographic Bible metadata...');

			// Load all JSON files (including verses.json for verse-to-metadata mapping)
			const people = await this.readPluginDataFile('theographic/people.json') as TheographicPerson[] | null;
			const places = await this.readPluginDataFile('theographic/places.json') as TheographicPlace[] | null;
			const events = await this.readPluginDataFile('theographic/events.json') as TheographicEvent[] | null;
			const periods = await this.readPluginDataFile('theographic/periods.json') as TheographicPeriod[] | null;
			const verses = await this.readPluginDataFile('theographic/verses.json') as TheographicVerse[] | null;

			if (!people && !places && !events && !periods && !verses) {
				console.debug('ℹ️ No Theographic data found');
				return;
			}

			// Store raw data
			this.theographicData.people = people;
			this.theographicData.places = places;
			this.theographicData.events = events;
			this.theographicData.periods = periods;
			this.theographicData.verses = verses;

			// Build indexes for fast lookups
			await this.buildTheographicIndexes();

			const peopleCount = people ? people.length : 0;
			const placesCount = places ? places.length : 0;
			const eventsCount = events ? events.length : 0;
			const periodsCount = periods ? periods.length : 0;
			const versesCount = verses ? verses.length : 0;

			console.debug(`✓ Theographic data loaded: ${peopleCount.toLocaleString()} people, ${placesCount.toLocaleString()} places, ${eventsCount.toLocaleString()} events, ${periodsCount.toLocaleString()} periods, ${versesCount.toLocaleString()} verses`);
			this.theographicData.loaded = true;

		} catch (error) {
			console.error('Error loading Theographic data:', error);
		}
	}

	/**
	 * Build indexes for fast verse-to-metadata lookups
	 * This creates Maps for O(1) lookups by verse reference
	 */
	async buildTheographicIndexes() {
		// Initialize indexes
		this.theographicData.peopleByVerse = new Map();
		this.theographicData.placesByVerse = new Map();
		this.theographicData.eventsByVerse = new Map();
		this.theographicData.peopleById = new Map();
		this.theographicData.placesById = new Map();
		this.theographicData.eventsById = new Map();
		this.theographicData.verseById = new Map();

		// Build ID indexes for people, places, events
		if (this.theographicData.people) {
			for (const person of this.theographicData.people) {
				this.theographicData.peopleById.set(person.id, person);
			}
		}

		if (this.theographicData.places) {
			for (const place of this.theographicData.places) {
				this.theographicData.placesById.set(place.id, place);
			}
		}

		if (this.theographicData.events) {
			for (const event of this.theographicData.events) {
				this.theographicData.eventsById.set(event.id, event);
			}
		}

		// Build verse-based indexes using verses.json
		// This creates Maps like "Genesis:1:1" -> [people array], [places array], [events array]
		if (this.theographicData.verses) {
			for (const verse of this.theographicData.verses) {
				// Store verse by ID for lookups
				this.theographicData.verseById.set(verse.id, verse);

				// Parse osisRef to get book:chapter:verse key
				// osisRef format: "Gen.1.1"
				const osisRef = verse.fields.osisRef;
				if (!osisRef) continue;

				// Convert OSIS reference to our format: "Genesis:1:1"
				const verseKey = this.convertOsisToVerseKey(osisRef);
				if (!verseKey) continue;

				// Map people IDs to Person objects
				if (verse.fields.people && verse.fields.people.length > 0) {
					const people: TheographicPerson[] = [];
					for (const personId of verse.fields.people) {
						const person = this.theographicData.peopleById.get(personId);
						if (person) people.push(person);
					}
					if (people.length > 0) {
						this.theographicData.peopleByVerse.set(verseKey, people);
					}
				}

				// Map place IDs to Place objects
				if (verse.fields.places && verse.fields.places.length > 0) {
					const places: TheographicPlace[] = [];
					for (const placeId of verse.fields.places) {
						const place = this.theographicData.placesById.get(placeId);
						if (place) places.push(place);
					}
					if (places.length > 0) {
						this.theographicData.placesByVerse.set(verseKey, places);
					}
				}

				// Map event IDs to Event objects
				if (verse.fields.event && verse.fields.event.length > 0) {
					const events: TheographicEvent[] = [];
					for (const eventId of verse.fields.event) {
						const event = this.theographicData.eventsById.get(eventId);
						if (event) events.push(event);
					}
					if (events.length > 0) {
						this.theographicData.eventsByVerse.set(verseKey, events);
					}
				}
			}
		}

		const verseIndexSize = this.theographicData.peopleByVerse.size +
		                       this.theographicData.placesByVerse.size +
		                       this.theographicData.eventsByVerse.size;
		console.debug(`✓ Theographic indexes built: ${verseIndexSize.toLocaleString()} verse mappings`);
	}

	/**
	 * Convert OSIS reference to our verse key format
	 * "Gen.1.1" -> "Genesis:1:1"
	 * "Exod.20.11" -> "Exodus:20:11"
	 */
	convertOsisToVerseKey(osisRef: string): string | null {
		// OSIS book abbreviation to full name mapping
		const osisToBook: { [key: string]: string } = {
			'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy',
			'Josh': 'Joshua', 'Judg': 'Judges', 'Ruth': 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
			'1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
			'Ezra': 'Ezra', 'Neh': 'Nehemiah', 'Esth': 'Esther', 'Job': 'Job', 'Ps': 'Psalm',
			'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa': 'Isaiah',
			'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel', 'Dan': 'Daniel', 'Hos': 'Hosea',
			'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah', 'Mic': 'Micah',
			'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai', 'Zech': 'Zechariah',
			'Mal': 'Malachi', 'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John',
			'Acts': 'Acts', 'Rom': 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
			'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phil': 'Philippians', 'Col': 'Colossians',
			'1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '1Tim': '1 Timothy', '2Tim': '2 Timothy',
			'Titus': 'Titus', 'Phlm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James', '1Pet': '1 Peter',
			'2Pet': '2 Peter', '1John': '1 John', '2John': '2 John', '3John': '3 John', 'Jude': 'Jude',
			'Rev': 'Revelation'
		};

		// Parse OSIS reference: "Gen.1.1" -> ["Gen", "1", "1"]
		const parts = osisRef.split('.');
		if (parts.length !== 3) return null;

		const osisBook = parts[0];
		const chapter = parts[1];
		const verse = parts[2];

		const bookName = osisToBook[osisBook];
		if (!bookName) {
			console.warn(`Unknown OSIS book abbreviation: ${osisBook}`);
			return null;
		}

		return `${bookName}:${chapter}:${verse}`;
	}

	/**
	 * Get Theographic data for a specific verse
	 * Returns people, places, and events mentioned in this verse
	 */
	getTheographicForVerse(book: string, chapter: number, verse: number): {
		people: TheographicPerson[];
		places: TheographicPlace[];
		events: TheographicEvent[];
	} {
		if (!this.theographicData.loaded) {
			return { people: [], places: [], events: [] };
		}

		// Create verse key: "Genesis:1:1"
		const verseKey = `${book}:${chapter}:${verse}`;

		// Look up in indexes
		const people = this.theographicData.peopleByVerse?.get(verseKey) || [];
		const places = this.theographicData.placesByVerse?.get(verseKey) || [];
		const events = this.theographicData.eventsByVerse?.get(verseKey) || [];

		return { people, places, events };
	}

	/**
	 * Get Strong's definition by number
	 * WITH PERFORMANCE TRACKING
	 */
	getStrongsDefinition(strongsNumber: string): StrongsGreekEntry | StrongsHebrewEntry | null {
		const startTime = performance.now();
		this.performanceStats.strongsLookups++;

		if (!this.strongsDictionary) {
			const responseTime = performance.now() - startTime;
			this.trackResponseTime(responseTime);
			return null;
		}

		let result: StrongsGreekEntry | StrongsHebrewEntry | null = null;

		if (strongsNumber.startsWith('G') && this.strongsDictionary.greek) {
			result = this.strongsDictionary.greek[strongsNumber] || null;
		} else if (strongsNumber.startsWith('H') && this.strongsDictionary.hebrew) {
			result = this.strongsDictionary.hebrew[strongsNumber] || null;
		}

		const responseTime = performance.now() - startTime;
		this.trackResponseTime(responseTime);

		return result;
	}

	/**
	 * Convert Bible book name to interlinear data key
	 * Bible data uses: "1 Samuel", "Psalm", "Song of Solomon"
	 * Interlinear uses: "i_samuel", "psalms", "song_of_solomon"
	 */
	bibleBookToInterlinearKey(bookName: string): string {
		// Mapping for all 66 books
		const mapping: { [key: string]: string } = {
			'Genesis': 'genesis',
			'Exodus': 'exodus',
			'Leviticus': 'leviticus',
			'Numbers': 'numbers',
			'Deuteronomy': 'deuteronomy',
			'Joshua': 'joshua',
			'Judges': 'judges',
			'Ruth': 'ruth',
			'1 Samuel': 'i_samuel',
			'2 Samuel': 'ii_samuel',
			'1 Kings': 'i_kings',
			'2 Kings': 'ii_kings',
			'1 Chronicles': 'i_chronicles',
			'2 Chronicles': 'ii_chronicles',
			'Ezra': 'ezra',
			'Nehemiah': 'nehemiah',
			'Esther': 'esther',
			'Job': 'job',
			'Psalm': 'psalms',  // Note: Bible data uses singular "Psalm"
			'Proverbs': 'proverbs',
			'Ecclesiastes': 'ecclesiastes',
			'Song of Solomon': 'song_of_solomon',
			'Isaiah': 'isaiah',
			'Jeremiah': 'jeremiah',
			'Lamentations': 'lamentations',
			'Ezekiel': 'ezekiel',
			'Daniel': 'daniel',
			'Hosea': 'hosea',
			'Joel': 'joel',
			'Amos': 'amos',
			'Obadiah': 'obadiah',
			'Jonah': 'jonah',
			'Micah': 'micah',
			'Nahum': 'nahum',
			'Habakkuk': 'habakkuk',
			'Zephaniah': 'zephaniah',
			'Haggai': 'haggai',
			'Zechariah': 'zechariah',
			'Malachi': 'malachi',
			'Matthew': 'matthew',
			'Mark': 'mark',
			'Luke': 'luke',
			'John': 'john',
			'Acts': 'acts',
			'Romans': 'romans',
			'1 Corinthians': 'i_corinthians',
			'2 Corinthians': 'ii_corinthians',
			'Galatians': 'galatians',
			'Ephesians': 'ephesians',
			'Philippians': 'philippians',
			'Colossians': 'colossians',
			'1 Thessalonians': 'i_thessalonians',
			'2 Thessalonians': 'ii_thessalonians',
			'1 Timothy': 'i_timothy',
			'2 Timothy': 'ii_timothy',
			'Titus': 'titus',
			'Philemon': 'philemon',
			'Hebrews': 'hebrews',
			'James': 'james',
			'1 Peter': 'i_peter',
			'2 Peter': 'ii_peter',
			'1 John': 'i_john',
			'2 John': 'ii_john',
			'3 John': 'iii_john',
			'Jude': 'jude',
			'Revelation': 'revelation'
		};

		return mapping[bookName] || bookName.toLowerCase().replace(/\s+/g, '_');
	}

	/**
	 * Convert interlinear data key back to Bible book name
	 * Reverse of bibleBookToInterlinearKey
	 */
	interlinearKeyToBibleBook(interlinearKey: string): string {
		// Reverse mapping
		const mapping: { [key: string]: string } = {
			'genesis': 'Genesis',
			'exodus': 'Exodus',
			'leviticus': 'Leviticus',
			'numbers': 'Numbers',
			'deuteronomy': 'Deuteronomy',
			'joshua': 'Joshua',
			'judges': 'Judges',
			'ruth': 'Ruth',
			'i_samuel': '1 Samuel',
			'ii_samuel': '2 Samuel',
			'i_kings': '1 Kings',
			'ii_kings': '2 Kings',
			'i_chronicles': '1 Chronicles',
			'ii_chronicles': '2 Chronicles',
			'ezra': 'Ezra',
			'nehemiah': 'Nehemiah',
			'esther': 'Esther',
			'job': 'Job',
			'psalms': 'Psalm',  // Note: Convert back to singular
			'proverbs': 'Proverbs',
			'ecclesiastes': 'Ecclesiastes',
			'song_of_solomon': 'Song of Solomon',
			'isaiah': 'Isaiah',
			'jeremiah': 'Jeremiah',
			'lamentations': 'Lamentations',
			'ezekiel': 'Ezekiel',
			'daniel': 'Daniel',
			'hosea': 'Hosea',
			'joel': 'Joel',
			'amos': 'Amos',
			'obadiah': 'Obadiah',
			'jonah': 'Jonah',
			'micah': 'Micah',
			'nahum': 'Nahum',
			'habakkuk': 'Habakkuk',
			'zephaniah': 'Zephaniah',
			'haggai': 'Haggai',
			'zechariah': 'Zechariah',
			'malachi': 'Malachi',
			'matthew': 'Matthew',
			'mark': 'Mark',
			'luke': 'Luke',
			'john': 'John',
			'acts': 'Acts',
			'romans': 'Romans',
			'i_corinthians': '1 Corinthians',
			'ii_corinthians': '2 Corinthians',
			'galatians': 'Galatians',
			'ephesians': 'Ephesians',
			'philippians': 'Philippians',
			'colossians': 'Colossians',
			'i_thessalonians': '1 Thessalonians',
			'ii_thessalonians': '2 Thessalonians',
			'i_timothy': '1 Timothy',
			'ii_timothy': '2 Timothy',
			'titus': 'Titus',
			'philemon': 'Philemon',
			'hebrews': 'Hebrews',
			'james': 'James',
			'i_peter': '1 Peter',
			'ii_peter': '2 Peter',
			'i_john': '1 John',
			'ii_john': '2 John',
			'iii_john': '3 John',
			'jude': 'Jude',
			'revelation': 'Revelation'
		};

		return mapping[interlinearKey] || interlinearKey;
	}

	/**
	 * Find all verses that use a specific Strong's number
	 */
	findVersesWithStrongsNumber(strongsNumber: string): Array<{book: string, chapter: number, verse: number}> {
		const results: Array<{book: string, chapter: number, verse: number}> = [];

		// Normalize the Strong's number to lowercase (interlinear data uses lowercase: g#### or h####)
		const normalizedNumber = strongsNumber.toLowerCase();

		// Search through interlinear data
		for (const [interlinearKey, bookData] of Object.entries(this.interlinearData)) {
			if (!bookData) continue;

			// Convert interlinear key back to Bible book name
			const bookName = this.interlinearKeyToBibleBook(interlinearKey);

			for (const verseEntry of bookData) {
				// Check if any word in this verse uses this Strong's number
				const hasStrongsNumber = verseEntry.verse.some(word => word.number === normalizedNumber);

				if (hasStrongsNumber) {
					// Parse the verse ID (format: BBCCCVVVv)
					const id = verseEntry.id;
					// Extract chapter and verse from the ID
					// Format is like "01001001v" for Genesis 1:1
					const chapterNum = parseInt(id.substring(2, 5)); // positions 2-4 (3 digits)
					const verseNum = parseInt(id.substring(5, 8));   // positions 5-7 (3 digits)

					results.push({
						book: bookName,  // Use converted Bible book name
						chapter: chapterNum,
						verse: verseNum
					});
				}
			}
		}

		return results;
	}

	/**
	 * Load interlinear data for a specific book
	 * Data is loaded on-demand and cached in memory
	 */
	async loadInterlinearBook(bookName: string): Promise<InterlinearBook | null> {
		try {
			// Check if already loaded
			if (this.interlinearData[bookName] !== undefined) {
				return this.interlinearData[bookName];
			}

			// Map book name to filename
			const filename = INTERLINEAR_BOOK_MAPPING[bookName];
			if (!filename) {
				console.warn(`No interlinear filename mapping for book: ${bookName}`);
				this.interlinearData[bookName] = null;
				return null;
			}

			// Load from plugin data folder
			const bookData = await this.readPluginDataFile(`interlinear/${filename}.json`);
			if (!bookData || !Array.isArray(bookData)) {
				console.warn(`Interlinear data not found for ${bookName}`);
				this.interlinearData[bookName] = null;
				return null;
			}

			// Cache in memory
			this.interlinearData[bookName] = bookData as InterlinearBook;
			console.debug(`✓ Loaded interlinear data for ${bookName} (${bookData.length} verses)`);
			return this.interlinearData[bookName];

		} catch (error) {
			console.error(`Error loading interlinear data for ${bookName}:`, error);
			this.interlinearData[bookName] = null;
			return null;
		}
	}

	/**
	 * Get interlinear data for a specific verse
	 * Returns word-level Strong's number mappings
	 * WITH CACHING for <50ms p95 response time
	 */
	async getInterlinearVerse(bookName: string, chapter: number, verse: number): Promise<InterlinearWord[] | null> {
		const startTime = performance.now();
		this.performanceStats.interlinearLookups++;

		try {
			// Check cache first (L1 cache - fastest)
			const cacheKey = `${bookName}:${chapter}:${verse}`;
			const cached = this.interlinearCache.get(cacheKey);

			if (cached) {
				// Cache hit!
				this.performanceStats.cacheHits++;
				cached.accessCount++;
				cached.timestamp = Date.now();

				const responseTime = performance.now() - startTime;
				this.trackResponseTime(responseTime);

				return cached.data;
			}

			// Cache miss - load from book data
			this.performanceStats.cacheMisses++;

			// Load book data if not already loaded
			const bookData = await this.loadInterlinearBook(bookName);
			if (!bookData) {
				const responseTime = performance.now() - startTime;
				this.trackResponseTime(responseTime);
				return null;
			}

			// Find the verse
			// Verse ID format: BBCCCVVVv where BB=book, CCC=chapter, VVV=verse, v=verse part
			const verseData = bookData.find(v => {
				// Parse the verse ID (e.g., "01001001" = Genesis 1:1)
				const verseId = v.id;
				const chapterNum = parseInt(verseId.substring(2, 5));
				const verseNum = parseInt(verseId.substring(5, 8));
				return chapterNum === chapter && verseNum === verse;
			});

			if (!verseData) {
				console.warn(`Interlinear verse not found: ${bookName} ${chapter}:${verse}`);
				const responseTime = performance.now() - startTime;
				this.trackResponseTime(responseTime);
				return null;
			}

			// Add to cache (LRU eviction if needed)
			this.addToInterlinearCache(cacheKey, verseData.verse);

			const responseTime = performance.now() - startTime;
			this.trackResponseTime(responseTime);

			return verseData.verse;

		} catch (error) {
			console.error(`Error getting interlinear verse ${bookName} ${chapter}:${verse}:`, error);
			const responseTime = performance.now() - startTime;
			this.trackResponseTime(responseTime);
			return null;
		}
	}

	/**
	 * Add verse to interlinear cache with LRU eviction
	 */
	addToInterlinearCache(key: string, data: InterlinearWord[]) {
		// Check if cache is full
		if (this.interlinearCache.size >= this.interlinearCacheMaxSize) {
			// Evict least recently used entry
			let lruKey: string | null = null;
			let oldestTime = Date.now();

			for (const [k, entry] of this.interlinearCache.entries()) {
				if (entry.timestamp < oldestTime) {
					oldestTime = entry.timestamp;
					lruKey = k;
				}
			}

			if (lruKey) {
				this.interlinearCache.delete(lruKey);
			}
		}

		// Add new entry
		this.interlinearCache.set(key, {
			data,
			timestamp: Date.now(),
			accessCount: 1
		});
	}

	/**
	 * Track response time and calculate p95
	 */
	trackResponseTime(responseTime: number) {
		this.performanceStats.totalResponseTime += responseTime;
		this.performanceStats.maxResponseTime = Math.max(this.performanceStats.maxResponseTime, responseTime);

		// Keep last 100 response times for p95 calculation
		this.performanceStats.responseTimes.push(responseTime);
		if (this.performanceStats.responseTimes.length > 100) {
			this.performanceStats.responseTimes.shift();
		}

		// Calculate p95 (95th percentile)
		if (this.performanceStats.responseTimes.length > 0) {
			const sorted = [...this.performanceStats.responseTimes].sort((a, b) => a - b);
			const p95Index = Math.floor(sorted.length * 0.95);
			this.performanceStats.p95ResponseTime = sorted[p95Index];
		}
	}

	/**
	 * Get performance statistics (for debugging)
	 */
	getPerformanceStats(): PerformanceStats {
		return {
			...this.performanceStats,
			// Calculate average response time
			avgResponseTime: this.performanceStats.strongsLookups > 0
				? this.performanceStats.totalResponseTime / this.performanceStats.strongsLookups
				: 0
		} as PerformanceStats & { avgResponseTime: number };
	}

	/**
	 * Clear caches and reset statistics
	 */
	clearCaches() {
		this.interlinearCache.clear();
		this.performanceStats = {
			strongsLookups: 0,
			interlinearLookups: 0,
			cacheHits: 0,
			cacheMisses: 0,
			totalResponseTime: 0,
			maxResponseTime: 0,
			p95ResponseTime: 0,
			responseTimes: []
		};
		console.debug('✓ Caches cleared and statistics reset');
	}

	/**
	 * Get Strong's number for a specific word in a verse
	 * Returns uppercase Strong's number (G#### or H####) or null
	 */
	async getStrongsForWord(bookName: string, chapter: number, verse: number, wordIndex: number): Promise<string | null> {
		try {
			const words = await this.getInterlinearVerse(bookName, chapter, verse);
			if (!words) return null;

			// Find word by index
			const word = words.find(w => w.i === wordIndex);
			if (!word || !word.number) return null;

			// Convert lowercase g/h prefix to uppercase G/H
			const strongsNum = word.number.toUpperCase();
			return strongsNum;

		} catch (error) {
			console.error(`Error getting Strong's for word:`, error);
			return null;
		}
	}

	/**
	 * Simple input prompt helper
	 */
	async promptForInput(title: string, placeholder: string, defaultValue: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new InputModal(this.app, title, placeholder, defaultValue, (value) => {
				resolve(value);
			});
			modal.open();
		});
	}

	buildSearchIndex(version: string) {
		const startTime = performance.now();

		const bible = this.getBibleData(version);
		if (!bible) {
			console.error(`Cannot build search index: ${version} not loaded`);
			return;
		}

		// Create word-level index
		const index = new Map<string, Array<{ book: string; chapter: number; verse: number; text: string }>>();

		for (const [bookName, bookData] of Object.entries(bible.books)) {
			for (const [chapterNum, chapterData] of Object.entries(bookData.chapters)) {
				for (const [verseNum, verseData] of Object.entries(chapterData.verses)) {
					// Extract text from verse (handle both string and StrongsVerse formats)
					const verseText = typeof verseData === 'string' ? verseData : verseData.text;

					// Tokenize verse text into words
					const words = verseText.toLowerCase()
						.replace(/[^\w\s]/g, ' ') // Remove punctuation
						.split(/\s+/) // Split on whitespace
						.filter((w: string) => w.length > 2); // Filter short words

					// Index each word
					words.forEach((word: string) => {
						if (!index.has(word)) {
							index.set(word, []);
						}
						index.get(word)!.push({
							book: bookName,
							chapter: parseInt(chapterNum),
							verse: parseInt(verseNum),
							text: verseText
						});
					});
				}
			}
		}

		// Store index
		this.searchIndexes.set(version, {
			version,
			index,
			timestamp: Date.now()
		});

	}

	async loadVOTDMapping() {
		try {
			const adapter = this.app.vault.adapter;
			// Hardcoded path in plugin data folder
			const votdPath = `${this.getPluginDataPath()}/verse-of-the-day.json`;

			if (await adapter.exists(votdPath)) {
				const votdJson = await adapter.read(votdPath);
				this.votdMapping = JSON.parse(votdJson);
			} else {
				console.debug('ℹ️ No Verse of the Day mapping file found - using fallback verses');
				this.votdMapping = null;
			}
		} catch (error) {
			console.error('Error loading VOTD mapping:', error);
			this.votdMapping = null;
		}
	}

	async loadJesusWords() {
		if (!this.settings.enableJesusWords) {
			console.debug('ℹ️ Jesus Words disabled in settings');
			return;
		}

		try {
			const adapter = this.app.vault.adapter;
			// Hardcoded path - deployed with plugin
			const jesusWordsPath = `${this.getPluginDir()}/src/data/jesus-words-complete.json`;

			console.debug('📂 Looking for Jesus Words at:', jesusWordsPath);

			const startTime = performance.now();

			if (await adapter.exists(jesusWordsPath)) {
				console.debug('✓ File exists, loading...');
				const jesusWordsJson = await adapter.read(jesusWordsPath);
				this.jesusWordsData = JSON.parse(jesusWordsJson);

				console.debug('📖 Jesus Words data loaded:', {
					hasData: !!this.jesusWordsData,
					hasVerses: !!this.jesusWordsData?.verses,
					versesLength: this.jesusWordsData?.verses?.length,
					totalVerses: this.jesusWordsData?.totalVerses
				});

				// Build fast lookup set from simple verse array
				this.jesusWordsLookup.clear();

				if (this.jesusWordsData && this.jesusWordsData.verses) {
					// Load all verse references into Set for O(1) lookup
					for (const verseRef of this.jesusWordsData.verses) {
						this.jesusWordsLookup.add(verseRef);
					}
				}

				const endTime = performance.now();
				const loadTime = (endTime - startTime).toFixed(2);

				console.debug(`✓ Jesus Words loaded: ${this.jesusWordsLookup.size} verses in ${loadTime}ms`);
				const gospelsText = (this.jesusWordsData?.gospels || []).join(', ') || 'Gospels';
				new Notice(`✓ Jesus Words loaded: ${this.jesusWordsLookup.size} red-letter verses across ${gospelsText}`);
			} else {
				console.debug('ℹ️ Jesus Words file not found - red-letter features disabled');
				console.debug(`   Expected location: ${jesusWordsPath}`);
				this.jesusWordsData = null;
			}
		} catch (error) {
			console.error('Error loading Jesus Words:', error);
			new Notice('Error loading Jesus Words - check console for details');
			this.jesusWordsData = null;
		}
	}

	isJesusWords(book: string, chapter: number, verse: number): boolean {
		const lookupKey = `${book} ${chapter}:${verse}`;
		return this.jesusWordsLookup.has(lookupKey);
	}

	/**
	 * Check if a verse is part of a disputed/textual variant passage
	 */
	getDisputedPassageInfo(book: string, chapter: number, verse: number): DisputedPassage | null {
		if (!this.settings.showDisputedPassages) return null;

		for (const passage of DISPUTED_PASSAGES) {
			if (passage.book !== book) continue;

			const startChapter = passage.startChapter;
			const endChapter = passage.endChapter || startChapter;
			const startVerse = passage.startVerse;
			const endVerse = passage.endVerse || startVerse;

			// Check if verse is within the disputed range
			if (chapter === startChapter && endChapter === startChapter) {
				// Same chapter range
				if (verse >= startVerse && verse <= endVerse) {
					return passage;
				}
			} else if (chapter === startChapter && verse >= startVerse) {
				return passage;
			} else if (chapter === endChapter && verse <= endVerse) {
				return passage;
			} else if (chapter > startChapter && chapter < endChapter) {
				return passage;
			}
		}
		return null;
	}

	async generateVOTDMapping(): Promise<boolean> {
		try {
			const adapter = this.app.vault.adapter;
			// Hardcoded path in plugin data folder
			const votdPath = `${this.getPluginDataPath()}/verse-of-the-day.json`;

			// Check if file already exists
			const fileExists = await adapter.exists(votdPath);
			if (fileExists) {
				// User should have already confirmed overwrite in settings
				new Notice('Regenerating verse of the day mapping...');
			}

			// Get all verses from default version
			const version = this.settings.defaultVersion;
			const bible = this.getBibleData(version);
			if (!bible) {
				new Notice('Error: Bible data not loaded');
				return false;
			}

			// Collect all verse references with text
			const allVerses: Array<{ book: string; chapter: number; verse: number; text: string; version: string }> = [];
			for (const [bookName, bookData] of Object.entries(bible.books)) {
				for (const [chapterNum, chapterData] of Object.entries(bookData.chapters)) {
					for (const [verseNum, verseData] of Object.entries(chapterData.verses)) {
						// Handle both string and StrongsVerse format
						const verseText = typeof verseData === 'string' ? verseData : verseData.text;
						allVerses.push({
							book: bookName,
							chapter: parseInt(chapterNum),
							verse: parseInt(verseNum),
							text: verseText,
							version: version
						});
					}
				}
			}


			// Shuffle and select 365 verses
			const shuffled = allVerses.sort(() => Math.random() - 0.5);
			const selected = shuffled.slice(0, 365);

			// Create mapping (day 1-365)
			const mapping: VOTDMapping = {};
			for (let day = 1; day <= 365; day++) {
				mapping[day] = selected[day - 1];
			}

			// Ensure the directory exists
			const folderPath = votdPath.substring(0, votdPath.lastIndexOf('/'));
			if (folderPath && !(await adapter.exists(folderPath))) {
				await this.app.vault.createFolder(folderPath);
			}

			// Save to file
			const mappingJson = JSON.stringify(mapping, null, 2);
			await adapter.write(votdPath, mappingJson);

			// Load the new mapping
			this.votdMapping = mapping;

			new Notice(`✅ Generated mapping with 365 verses and saved to ${votdPath}`);

			// Refresh view to show new verse
			this.refreshView();

			return true;
		} catch (error) {
			console.error('Error generating VOTD mapping:', error);
			new Notice('Error generating Verse of the Day mapping');
			return false;
		}
	}

	getBibleData(version: string): BibleData | null {
		return this.bibleVersions.get(version) || null;
	}

	getBooksArray(version: string): string[] {
		const bible = this.getBibleData(version);
		if (!bible) return [];
		return Object.keys(bible.books);
	}

	/**
	 * Get the canonical order index for a book (for sorting)
	 */
	getBookOrder(book: string): number {
		const books = this.getBooksArray(this.settings.bibleVersions[0] || 'ESV');
		const index = books.indexOf(book);
		return index >= 0 ? index : 999; // Unknown books go last
	}

	getChaptersArray(version: string, bookName: string): number[] {
		const bible = this.getBibleData(version);
		if (!bible || !bible.books[bookName]) return [];
		return Object.keys(bible.books[bookName].chapters).map(Number).sort((a, b) => a - b);
	}

	getChapter(version: string, bookName: string, chapterNumber: number): BibleChapter | null {
		// Check cache first
		const cacheKey = `${version}-${bookName}-${chapterNumber}`;
		const cached = this.chapterCache.get(cacheKey);

		if (cached) {
			// Update timestamp (LRU tracking)
			cached.timestamp = Date.now();
			return cached.data;
		}

		// Not in cache - fetch from Bible data
		const bible = this.getBibleData(version);
		if (!bible || !bible.books[bookName]) return null;
		const chapter = bible.books[bookName].chapters[chapterNumber.toString()] || null;

		if (chapter) {
			// Add to cache
			this.chapterCache.set(cacheKey, {
				version,
				book: bookName,
				chapter: chapterNumber,
				data: chapter,
				timestamp: Date.now()
			});

			// Evict oldest if cache is full
			if (this.chapterCache.size > this.maxCacheSize) {
				let oldestKey: string | null = null;
				let oldestTime = Date.now();

				for (const [key, entry] of this.chapterCache.entries()) {
					if (entry.timestamp < oldestTime) {
						oldestTime = entry.timestamp;
						oldestKey = key;
					}
				}

				if (oldestKey) {
					this.chapterCache.delete(oldestKey);
				}
			}
		}

		return chapter;
	}

	getVerse(version: string, bookName: string, chapterNumber: number, verseNumber: number): string | StrongsVerse | null {
		const chapter = this.getChapter(version, bookName, chapterNumber);
		if (!chapter) return null;
		return chapter.verses[verseNumber.toString()] || null;
	}

	getVerseText(version: string, bookName: string, chapterNumber: number, verseNumber: number): string | null {
		const verse = this.getVerse(version, bookName, chapterNumber, verseNumber);
		if (!verse) return null;

		// Handle both string (ESV/NIV) and StrongsVerse (BSB) formats
		if (typeof verse === 'string') {
			return verse;
		} else {
			return verse.text; // StrongsVerse has .text property
		}
	}

	refreshView() {
		// Find the active Bible view and refresh it
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_BIBLE);
		if (leaves.length > 0) {
			const view = leaves[0].view;
			if (view instanceof BibleView) {
				view.render();
			}
		}
	}

	async loadHighlightsAndNotes() {
		try {
			const data = await this.loadData();
			if (data) {
				this.highlights = data.highlights || [];
				this.noteReferences = data.noteReferences || [];
				this.bookmarks = data.bookmarks || [];
				this.verseTags = data.verseTags || [];
			}
		} catch (error) {
			console.error('Error loading highlights and notes:', error);
		}
	}

	async saveHighlightsAndNotes() {
		try {
			const data = await this.loadData() || {};
			data.highlights = this.highlights;
			data.noteReferences = this.noteReferences;
			data.bookmarks = this.bookmarks;
			data.verseTags = this.verseTags;
			// Note: cross-references now stored in plugin data folder, not data.json
			await this.saveData(data);
		} catch (error) {
			console.error('Error saving highlights and notes:', error);
		}
	}

	// Add a highlight
	async addHighlight(highlight: Highlight) {
		this.highlights.push(highlight);
		await this.saveHighlightsAndNotes();
		this.trackHighlightAdded(); // Track for study session
	}

	// Remove a highlight by ID
	async removeHighlight(id: string) {
		this.highlights = this.highlights.filter(h => h.id !== id);
		await this.saveHighlightsAndNotes();
	}

	// Get highlights for a specific verse (filtered by visible layers)
	getHighlightsForVerse(book: string, chapter: number, verse: number): Highlight[] {
		const visibleLayers = this.settings.visibleAnnotationLayers;

		return this.highlights.filter(h => {
			if (h.book !== book || h.chapter !== chapter) return false;

			// Filter by visible layers (highlights without layer default to 'personal')
			const highlightLayer = h.layer || 'personal';
			if (!visibleLayers.includes(highlightLayer)) return false;

			// Check if verse is in the highlight range
			if (h.endVerse) {
				// Range highlight: check if verse is within range
				return verse >= h.verse && verse <= h.endVerse;
			} else {
				// Single verse highlight
				return h.verse === verse;
			}
		});
	}

	getHighlightsForChapter(book: string, chapter: number): Highlight[] {
		const visibleLayers = this.settings.visibleAnnotationLayers;

		return this.highlights.filter(h => {
			if (h.book !== book || h.chapter !== chapter) return false;

			// Filter by visible layers (highlights without layer default to 'personal')
			const highlightLayer = h.layer || 'personal';
			return visibleLayers.includes(highlightLayer);
		});
	}

	// Add a note reference
	async addNoteReference(noteRef: NoteReference) {
		this.noteReferences.push(noteRef);
		await this.saveHighlightsAndNotes();
		this.trackNoteCreated(); // Track for study session
	}

	// Remove a note reference
	async removeNoteReference(book: string, chapter: number, verse: number, noteType?: NoteType) {
		if (noteType) {
			// Remove specific note type
			this.noteReferences = this.noteReferences.filter(n =>
				!(n.book === book && n.chapter === chapter && n.verse === verse && n.noteType === noteType)
			);
		} else {
			// Remove all notes for this verse (backward compatibility)
			this.noteReferences = this.noteReferences.filter(n =>
				!(n.book === book && n.chapter === chapter && n.verse === verse)
			);
		}
		await this.saveHighlightsAndNotes();
	}

	// Add a bookmark
	async addBookmark(bookmark: Bookmark) {
		this.bookmarks.push(bookmark);
		await this.saveHighlightsAndNotes();
	}

	/**
	 * Show a modal to prompt for bookmark name
	 * Returns the name or null if cancelled
	 */
	async promptBookmarkName(defaultName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Name your bookmark');

			const contentEl = modal.contentEl;
			contentEl.empty();
			contentEl.addClass('bookmark-name-modal');

			const inputContainer = contentEl.createDiv({ cls: 'bookmark-name-input-container' });
			inputContainer.createEl('label', { text: 'Bookmark name:', cls: 'bookmark-name-label' });

			const input = inputContainer.createEl('input', {
				type: 'text',
				cls: 'bookmark-name-input',
				value: defaultName,
				placeholder: 'Enter a name for this bookmark...'
			});

			const buttonContainer = contentEl.createDiv({ cls: 'bookmark-name-buttons' });

			const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel', cls: 'bookmark-name-btn' });
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(null);
			});

			const saveBtn = buttonContainer.createEl('button', { text: 'Save', cls: 'bookmark-name-btn mod-cta' });
			saveBtn.addEventListener('click', () => {
				const name = input.value.trim() || defaultName;
				modal.close();
				resolve(name);
			});

			// Enter key submits
			input.addEventListener('keypress', (e) => {
				if (e.key === 'Enter') {
					const name = input.value.trim() || defaultName;
					modal.close();
					resolve(name);
				}
			});

			// Focus and select input
			modal.onOpen = () => {
				input.focus();
				input.select();
			};

			modal.open();
		});
	}

	// Remove a bookmark by ID
	async removeBookmark(id: string) {
		this.bookmarks = this.bookmarks.filter(b => b.id !== id);
		await this.saveHighlightsAndNotes();
	}

	// Get bookmark for a specific verse
	getBookmarkForVerse(book: string, chapter: number, verse: number): Bookmark | null {
		return this.bookmarks.find(b =>
			b.book === book && b.chapter === chapter && b.verse === verse
		) || null;
	}

	// Check if verse is bookmarked
	isBookmarked(book: string, chapter: number, verse: number): boolean {
		return !!this.getBookmarkForVerse(book, chapter, verse);
	}

	// Add a tag to a verse
	async addVerseTag(tag: VerseTag) {
		this.verseTags.push(tag);
		await this.saveHighlightsAndNotes();
	}

	// Remove a tag by ID
	async removeVerseTag(id: string) {
		this.verseTags = this.verseTags.filter(t => t.id !== id);
		await this.saveHighlightsAndNotes();
	}

	// Get all tags for a specific verse
	getTagsForVerse(book: string, chapter: number, verse: number): VerseTag[] {
		return this.verseTags.filter(t =>
			t.book === book && t.chapter === chapter && t.verse === verse
		);
	}

	// Check if verse has a specific tag
	verseHasTag(book: string, chapter: number, verse: number, tagName: string): boolean {
		return this.verseTags.some(t =>
			t.book === book && t.chapter === chapter && t.verse === verse && t.tag === tagName
		);
	}

	// Get all unique tag names (from both verse associations and registered tags)
	getAllTagNames(): string[] {
		const tagSet = new Set(this.verseTags.map(t => t.tag));
		// Also include registered tags that may not have verse associations yet
		if (this.settings.registeredTags) {
			this.settings.registeredTags.forEach(t => tagSet.add(t));
		}
		return Array.from(tagSet).sort();
	}

	// Get all verses with a specific tag
	getVersesWithTag(tagName: string): VerseTag[] {
		return this.verseTags.filter(t => t.tag === tagName);
	}

	// Rename a tag across all verses
	renameTag(oldName: string, newName: string) {
		this.verseTags.forEach(t => {
			if (t.tag === oldName) {
				t.tag = newName;
			}
		});
		void this.saveHighlightsAndNotes();
	}

	// Delete a tag from all verses
	deleteTagFromAll(tagName: string) {
		this.verseTags = this.verseTags.filter(t => t.tag !== tagName);
		void this.saveHighlightsAndNotes();
	}

	// Get tags from a note file
	async getNoteTags(notePath: string): Promise<string[]> {
		try {
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (!file) return [];

			const content = await this.app.vault.read(file as any);

			// Extract YAML frontmatter
			const yamlMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
			if (!yamlMatch) return [];

			const yamlContent = yamlMatch[1];

			// Extract tags from YAML - match all lines that start with "  - " under tags:
			const tagsMatch = yamlContent.match(/tags:\s*\n((?:  - .+(?:\n|$))*)/);
			if (!tagsMatch) return [];

			const tagsSection = tagsMatch[1].trim();
			if (!tagsSection) return [];

			// Split by newlines and extract tag values
			const tagLines = tagsSection.split('\n').filter(line => line.trim().startsWith('-'));
			const tags = tagLines.map(line => line.trim().replace(/^- /, '').trim()).filter(tag => tag.length > 0);

			console.debug('🏷️ Extracted tags from', notePath, ':', tags);

			return tags;
		} catch (error) {
			console.error(`Error reading tags from ${notePath}:`, error);
			return [];
		}
	}

	// Get all unique tags across all notes
	async getAllTags(): Promise<Array<{tag: string, count: number}>> {
		const tagCounts = new Map<string, number>();

		console.debug('🏷️ Getting all tags from', this.noteReferences.length, 'notes');

		for (const noteRef of this.noteReferences) {
			const tags = await this.getNoteTags(noteRef.notePath);
			console.debug('📄', noteRef.notePath, '→ tags:', tags);
			for (const tag of tags) {
				tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
			}
		}

		console.debug('🏷️ Total unique tags found:', tagCounts.size);
		console.debug('🏷️ Tags:', Array.from(tagCounts.keys()));

		return Array.from(tagCounts.entries())
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => b.count - a.count); // Sort by count descending
	}

	// Add tag to a note
	async addTagToNote(notePath: string, newTag: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (!file) return false;

			let content = await this.app.vault.read(file as any);

			// Check if tag already exists
			const existingTags = await this.getNoteTags(notePath);
			if (existingTags.includes(newTag)) {
				return false; // Tag already exists
			}

			// Find the tags section in YAML
			const yamlMatch = content.match(/^(---\s*\n[\s\S]*?tags:\s*\n(?:  - .+\n)*)(---)/);
			if (yamlMatch) {
				// Insert new tag before the closing ---
				const beforeTags = yamlMatch[1];
				const afterTags = yamlMatch[2];
				const newTagLine = `  - ${newTag}\n`;
				content = content.replace(yamlMatch[0], beforeTags + newTagLine + afterTags);

				await this.app.vault.modify(file as any, content);
				return true;
			}

			return false;
		} catch (error) {
			console.error(`Error adding tag to ${notePath}:`, error);
			return false;
		}
	}

	// Remove tag from a note
	async removeTagFromNote(notePath: string, tagToRemove: string): Promise<boolean> {
		try {
			const file = this.app.vault.getAbstractFileByPath(notePath);
			if (!file) return false;

			let content = await this.app.vault.read(file as any);

			// Find and remove the tag line
			const tagLineRegex = new RegExp(`  - ${tagToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\n`, 'g');
			content = content.replace(tagLineRegex, '');

			await this.app.vault.modify(file as any, content);
			return true;
		} catch (error) {
			console.error(`Error removing tag from ${notePath}:`, error);
			return false;
		}
	}

	// Get note references for a specific verse
	getNoteReferencesForVerse(book: string, chapter: number, verse: number): NoteReference[] {
		return this.noteReferences.filter(n => {
			// Match book first
			if (n.book !== book) return false;

			// Book notes don't show on individual verses (only in book selector)
			if (n.noteLevel === 'book') return false;

			// Chapter notes don't show on individual verses (only in chapter heading)
			if (n.noteLevel === 'chapter') return false;

			// Must match chapter for verse and passage notes
			if (n.chapter !== chapter) return false;

			// Exact verse match (verse notes)
			if (n.verse === verse && n.noteLevel === 'verse') return true;

			// Check if verse falls within passage range
			if (n.noteLevel === 'passage' && n.endVerse) {
				return verse >= n.verse && verse <= n.endVerse;
			}

			return false;
		});
	}

	// Create a new note file for a verse
	async createVerseNote(book: string, chapter: number, verse: number, noteType: NoteType = 'personal'): Promise<string> {
		// Include note type in filename to allow multiple notes per verse
		const noteFileName = `${book} ${chapter}_${verse}_${noteType}.md`;
		const notePath = `${this.settings.notesFolder}/${noteFileName}`;

		// Ensure notes folder exists
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(this.settings.notesFolder))) {
			await adapter.mkdir(this.settings.notesFolder);
		}

		// Get the verse text
		const verseText = this.getVerseText(this.settings.defaultVersion, book, chapter, verse) || '';

		// Get current date in YYYY-MM-DD format
		const today = new Date().toISOString().split('T')[0];

		// Create YAML frontmatter
		const frontmatter = `---
type: ${noteType}
book: ${book}
chapter: ${chapter}
verse: ${verse}
reference: ${book} ${chapter}:${verse}
version: ${this.settings.defaultVersion}
created: ${today}
tags:
  - bible/${book.toLowerCase()}
  - bible-notes/${noteType}
---

`;

		// Build reference and callout
		const calloutTitle = this.settings.calloutTitle || 'bible';
		const reference = `${book} ${chapter}:${verse}`;
		// Full callout block for {{callout}} variable
		const formattedCallout = `> [!${calloutTitle}] ${reference}\n> **${verse}** ${verseText}`;

		// Create note content from template with variable substitution
		// {{verseText}} = plain verse text, {{callout}} = formatted callout block
		const templateContent = this.settings.noteTemplate
			.replace(/\{\{reference\}\}/g, reference)
			.replace(/\{\{version\}\}/g, this.settings.defaultVersion)
			.replace(/\{\{verse\}\}/g, verse.toString())
			.replace(/\{\{verseText\}\}/g, verseText)
			.replace(/\{\{callout\}\}/g, formattedCallout);

		const noteContent = frontmatter + templateContent;

		// Create the file if it doesn't exist
		if (!(await adapter.exists(notePath))) {
			await adapter.write(notePath, noteContent);
		}

		// Add note reference
		await this.addNoteReference({
			book,
			chapter,
			verse,
			noteLevel: 'verse',
			noteType: noteType,
			notePath
		});

		return notePath;
	}

	// Create a new note file for a passage (verse range)
	async createPassageNote(book: string, chapter: number, startVerse: number, endVerse: number, noteType: NoteType = 'personal'): Promise<string> {
		const noteFileName = `${book} ${chapter}_${startVerse}-${endVerse}_${noteType}.md`;
		const notePath = `${this.settings.notesFolder}/${noteFileName}`;

		// Ensure notes folder exists
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(this.settings.notesFolder))) {
			await adapter.mkdir(this.settings.notesFolder);
		}

		// Build reference, plain text, and callout
		const calloutTitle = this.settings.calloutTitle || 'bible';
		const reference = `${book} ${chapter}:${startVerse}-${endVerse}`;

		// Collect plain text and callout versions
		let plainText = '';
		let calloutText = `> [!${calloutTitle}] ${reference}\n`;
		for (let v = startVerse; v <= endVerse; v++) {
			const verseText = this.getVerseText(this.settings.defaultVersion, book, chapter, v) || '';
			plainText += `**${v}** ${verseText}\n`;
			calloutText += `> **${v}** ${verseText}\n`;
		}

		// Get current date
		const today = new Date().toISOString().split('T')[0];

		// Create YAML frontmatter
		const frontmatter = `---
type: ${noteType}
book: ${book}
chapter: ${chapter}
verse: ${startVerse}
endVerse: ${endVerse}
reference: ${reference}
version: ${this.settings.defaultVersion}
created: ${today}
tags:
  - bible/${book.toLowerCase()}
  - bible-notes/${noteType}
---

`;

		// Create note content from template with variable substitution
		// {{verseText}} = plain text, {{callout}} = formatted callout block
		const templateContent = this.settings.noteTemplate
			.replace(/\{\{reference\}\}/g, reference)
			.replace(/\{\{version\}\}/g, this.settings.defaultVersion)
			.replace(/\{\{verse\}\}/g, `${startVerse}-${endVerse}`)
			.replace(/\{\{verseText\}\}/g, plainText.trim())
			.replace(/\{\{callout\}\}/g, calloutText.trim());

		const noteContent = frontmatter + templateContent;

		// Create the file if it doesn't exist
		if (!(await adapter.exists(notePath))) {
			await adapter.write(notePath, noteContent);
		}

		// Add note reference for the start verse (passage notes are anchored to start verse)
		this.addNoteReference({
			book,
			chapter,
			verse: startVerse,
			endVerse,
			noteLevel: 'passage',
			noteType: noteType,
			notePath
		});

		return notePath;
	}

	// Create a new note file for a chapter
	async createChapterNote(book: string, chapter: number, noteType: NoteType = 'personal'): Promise<string> {
		const noteFileName = `${book} ${chapter}_${noteType}.md`;
		const notePath = `${this.settings.notesFolder}/${noteFileName}`;

		// Ensure notes folder exists
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(this.settings.notesFolder))) {
			await adapter.mkdir(this.settings.notesFolder);
		}

		// Get current date
		const today = new Date().toISOString().split('T')[0];

		// Create YAML frontmatter
		const frontmatter = `---
type: ${noteType}
book: ${book}
chapter: ${chapter}
reference: ${book} ${chapter}
version: ${this.settings.defaultVersion}
created: ${today}
tags:
  - bible/${book.toLowerCase()}
  - bible-notes/${noteType}
---

`;

		// Create note content from template with variable substitution
		const templateContent = this.settings.noteTemplate
			.replace(/\{\{reference\}\}/g, `${book} ${chapter}`)
			.replace(/\{\{version\}\}/g, this.settings.defaultVersion)
			.replace(/\{\{verse\}\}/g, `Chapter ${chapter}`)
			.replace(/\{\{verseText\}\}/g, `Notes for ${book} chapter ${chapter}`);

		const noteContent = frontmatter + templateContent;

		// Create the file if it doesn't exist
		if (!(await adapter.exists(notePath))) {
			await adapter.write(notePath, noteContent);
		}

		// Add note reference (chapter notes use verse 0 as anchor)
		this.addNoteReference({
			book,
			chapter,
			verse: 0,
			noteLevel: 'chapter',
			noteType: noteType,
			notePath
		});

		return notePath;
	}

	// Create a new note file for a book
	async createBookNote(book: string, noteType: NoteType = 'personal'): Promise<string> {
		const noteFileName = `${book}_${noteType}.md`;
		const notePath = `${this.settings.notesFolder}/${noteFileName}`;

		// Ensure notes folder exists
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(this.settings.notesFolder))) {
			await adapter.mkdir(this.settings.notesFolder);
		}

		// Get current date
		const today = new Date().toISOString().split('T')[0];

		// Create YAML frontmatter
		const frontmatter = `---
type: ${noteType}
book: ${book}
reference: ${book}
version: ${this.settings.defaultVersion}
created: ${today}
tags:
  - bible/${book.toLowerCase()}
  - bible-notes/${noteType}
---

`;

		// Create note content from template with variable substitution
		const templateContent = this.settings.noteTemplate
			.replace(/\{\{reference\}\}/g, book)
			.replace(/\{\{version\}\}/g, this.settings.defaultVersion)
			.replace(/\{\{verse\}\}/g, `Book Overview`)
			.replace(/\{\{verseText\}\}/g, `Overview and notes for the book of ${book}`);

		const noteContent = frontmatter + templateContent;

		// Create the file if it doesn't exist
		if (!(await adapter.exists(notePath))) {
			await adapter.write(notePath, noteContent);
		}

		// Add note reference (book notes use chapter 0, verse 0 as anchor)
		this.addNoteReference({
			book,
			chapter: 0,
			verse: 0,
			noteLevel: 'book',
			noteType: noteType,
			notePath
		});

		return notePath;
	}
}

// Bible view class
class BibleView extends ItemView {
	plugin: BiblePortalPlugin;
	currentBook: string = 'Genesis';
	currentChapter: number = 1;
	currentVersion: string;
	secondVersion: string | null = null; // For parallel viewing
	viewMode: ViewMode = ViewMode.CHAPTER;

	// For verse/passage lookup
	lookupInput: string = '';
	lookupStartVerse: number = 1;
	lookupEndVerse: number = 1;

	// For Strong's lookup
	strongsLookupInput: string = '';
	strongsLookupResult: StrongsGreekEntry | StrongsHebrewEntry | null = null;

	// Selected Strong's word for Word Study tab
	selectedStrongsWord: string | null = null;

	// For verse range selection (bookmarking)
	selectedVerseStart: number | null = null;
	selectedVerseEnd: number | null = null;

	// Note type filter (null = show all)
	noteTypeFilter: NoteType | null = null;

	// Note search results
	noteSearchResults: Array<{
		reference: string;
		noteType: NoteType;
		notePath: string;
		preview: string;
		book: string;
		chapter: number;
		verse?: number;
	}> = [];

	// Tag filter (null = show all)
	tagFilter: string | null = null;

	// Note preview verse (which verse's notes to show in sidebar)
	previewVerse: number | null = null;

	// Responsive sidebar visibility (auto-hide when narrow)
	sidebarVisible: boolean = true;
	resizeObserver: ResizeObserver | null = null;

	// Parallel view sync scrolling
	syncScroll: boolean = true; // Sync scroll between parallel panels
	isScrolling: boolean = false; // Prevent scroll event loops

	// Navigation history for back button
	navigationHistory: Array<{
		book: string;
		chapter: number;
		viewMode: ViewMode;
		lookupInput?: string;
		strongsLookupInput?: string;
	}> = [];
	historyIndex: number = -1;

	// Selected collection ID for Collections mode
	selectedCollectionId: string | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: BiblePortalPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.currentVersion = plugin.settings.defaultVersion;
		if (plugin.settings.parallelViewEnabled && plugin.settings.bibleVersions.length > 1) {
			// Set second version for parallel view
			const versions = plugin.settings.bibleVersions.filter(v => v !== this.currentVersion);
			this.secondVersion = versions[0] || null;
		}
	}

	getViewType(): string {
		return VIEW_TYPE_BIBLE;
	}

	getDisplayText(): string {
		return 'Bible Portal';
	}

	getIcon(): string {
		return 'book-open';
	}

	/**
	 * Render the view and scroll to a specific verse.
	 * Use this for actions within the same chapter (highlights, bookmarks, etc.)
	 */
	async renderAndScrollToVerse(verseNumber: number) {
		await this.render();

		// Wait for DOM to settle
		await new Promise(resolve => requestAnimationFrame(resolve));

		// Scroll to the verse
		setTimeout(() => {
			const verseEl = this.containerEl.querySelector(`.bible-verse[data-verse="${verseNumber}"]`) as HTMLElement;
			if (verseEl) {
				verseEl.scrollIntoView({ behavior: 'auto', block: 'center' });
			}
		}, 50);
	}

	/**
	 * @deprecated Use renderAndScrollToVerse instead
	 */
	async renderPreservingScroll() {
		// Fallback for any remaining calls - just render without scroll preservation
		await this.render();
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('bible-portal-view');

		// Set up resize observer for responsive sidebar
		this.setupResizeObserver();

		// Render the UI
		await this.render();
	}

	async onClose() {
		// Cleanup resize observer
		if (this.resizeObserver) {
			this.resizeObserver.disconnect();
			this.resizeObserver = null;
		}
	}

	/**
	 * Set up resize observer to auto-hide sidebar when container is narrow
	 * Hides sidebar when pane width drops below threshold to give more room for verse text
	 */
	setupResizeObserver() {
		const SIDEBAR_HIDE_THRESHOLD = 1000; // pixels - hide sidebar below this width (hide sooner)

		this.resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const width = entry.contentRect.width;
				const shouldShowSidebar = width >= SIDEBAR_HIDE_THRESHOLD;

				if (this.sidebarVisible !== shouldShowSidebar) {
					this.sidebarVisible = shouldShowSidebar;

					// Handle parallel view checkbox visibility on narrow screens
					const parallelCheckbox = this.containerEl.querySelector('.parallel-checkbox-container');

					if (parallelCheckbox) {
						if (shouldShowSidebar) {
							(parallelCheckbox as HTMLElement).style.display = '';
						} else {
							(parallelCheckbox as HTMLElement).style.display = 'none';
							// Also disable parallel view if it was on
							if (this.secondVersion) {
								this.secondVersion = null;
								void this.render();
							}
						}
					}
				}
			}
		});

		// Observe the container
		const container = this.containerEl.children[1];
		if (container) {
			this.resizeObserver.observe(container);
		}
	}

	/**
	 * Set up synchronized scrolling between parallel view panels
	 * Uses percentage-based sync to handle different content heights
	 */
	setupParallelScrollSync(leftPanel: HTMLElement, rightPanel: HTMLElement) {
		let scrollTimeout: number | null = null;

		const syncScroll = (source: HTMLElement, target: HTMLElement) => {
			if (!this.syncScroll || this.isScrolling) return;

			this.isScrolling = true;

			// Calculate scroll percentage (guard against division by zero)
			const maxScroll = source.scrollHeight - source.clientHeight;
			if (maxScroll <= 0) {
				this.isScrolling = false;
				return;
			}

			const scrollPercent = source.scrollTop / maxScroll;

			// Apply to target panel
			const targetMaxScroll = target.scrollHeight - target.clientHeight;
			const targetScrollTop = scrollPercent * targetMaxScroll;
			target.scrollTop = targetScrollTop;

			// Reset flag after a delay to prevent feedback loops
			if (scrollTimeout) clearTimeout(scrollTimeout);
			scrollTimeout = window.setTimeout(() => {
				this.isScrolling = false;
			}, 50);
		};

		// Scroll sync listeners
		leftPanel.addEventListener('scroll', () => syncScroll(leftPanel, rightPanel));
		rightPanel.addEventListener('scroll', () => syncScroll(rightPanel, leftPanel));
	}

	renderSidebarModes(sidebar: HTMLElement) {
		// Using Lucide icons instead of emojis for professional look
		// Unified Bible viewer handles chapter/verse/passage through smart reference input
		const modes: { icon: string; mode: ViewMode; title: string }[] = [
			{ icon: 'book-open', mode: ViewMode.CHAPTER, title: 'Bible' },
			{ icon: 'pencil', mode: ViewMode.NOTES_BROWSER, title: 'Notes' },
			{ icon: 'highlighter', mode: ViewMode.HIGHLIGHTS_BROWSER, title: 'Highlights' },
			{ icon: 'bookmark', mode: ViewMode.BOOKMARKS_BROWSER, title: 'Bookmarks' },
			{ icon: 'tags', mode: ViewMode.TAGS_BROWSER, title: 'Tags' },
			{ icon: 'folder-open', mode: ViewMode.COLLECTIONS, title: 'Collections' }
		];

		// Always show Strong's Lookup if dictionary is loaded (not controlled by enableStrongs checkbox)
		if (this.plugin.strongsDictionary) {
			modes.push({ icon: 'search', mode: ViewMode.STRONGS, title: 'Strong\'s Lookup' });
		}

		if (this.plugin.settings.enableTheographic && this.plugin.theographicData.loaded) {
			modes.push(
				{ icon: 'users', mode: ViewMode.PEOPLE_INDEX, title: 'People index' },
				{ icon: 'map', mode: ViewMode.MAP_VIEW, title: 'Map' },
				{ icon: 'calendar', mode: ViewMode.TIMELINE_VIEW, title: 'Timeline' }
			);
		}

		// Always show Concordance (will offer to build if no data)
		modes.push({ icon: 'list', mode: ViewMode.CONCORDANCE, title: 'Concordance' });

		// Add Achievements if enabled
		if (this.plugin.settings.enableAchievements) {
			modes.push({ icon: 'trophy', mode: ViewMode.ACHIEVEMENTS, title: 'Achievements' });
		}

		// Add Reading Plan if enabled
		if (this.plugin.settings.enableReadingPlan) {
			modes.push({ icon: 'book-open-check', mode: ViewMode.READING_PLAN, title: 'Reading plan' });
		}

		// Add Memorization mode if enabled
		if (this.plugin.settings.enableMemorization) {
			modes.push({ icon: 'brain', mode: ViewMode.MEMORIZATION, title: 'Memorization' });
		}

		// Add Study Journal if session tracking is enabled
		if (this.plugin.settings.enableSessionTracking) {
			modes.push({ icon: 'book-text', mode: ViewMode.STUDY_JOURNAL, title: 'Study journal' });
			modes.push({ icon: 'bar-chart-2', mode: ViewMode.STUDY_INSIGHTS, title: 'Study insights' });
		}

		// Add Comparison Matrix (always available)
		modes.push({ icon: 'columns', mode: ViewMode.COMPARISON_MATRIX, title: 'Compare versions' });

		modes.forEach(m => {
			const btn = sidebar.createEl('button', {
				cls: this.viewMode === m.mode ? 'sidebar-mode-btn active' : 'sidebar-mode-btn',
				attr: { 'aria-label': m.title, title: m.title }
			});
			const iconSpan = btn.createSpan({ cls: 'sidebar-mode-icon' });
			setIcon(iconSpan, m.icon);
			btn.createSpan({ text: m.title, cls: 'sidebar-mode-title' });
			btn.addEventListener('click', () => {
				this.viewMode = m.mode;
				void this.render();
			});
		});
	}

	updateVerseSelection() {
		// Update verse selection styling without re-rendering entire view
		const verseElements = this.containerEl.querySelectorAll('.bible-verse');
		verseElements.forEach((verseEl: HTMLElement) => {
			const verseNum = parseInt(verseEl.getAttribute('data-verse') || '0');
			const isSelected = this.selectedVerseEnd !== null
				? (verseNum >= this.selectedVerseStart! && verseNum <= this.selectedVerseEnd)
				: (verseNum === this.selectedVerseStart);

			// Remove all selection classes first
			verseEl.removeClass('verse-selected', 'selection-start', 'selection-middle', 'selection-end', 'selection-single');

			if (isSelected) {
				verseEl.addClass('verse-selected');

				// Add enhanced range selection classes
				if (this.selectedVerseEnd !== null && this.selectedVerseEnd !== this.selectedVerseStart) {
					// Multi-verse range
					if (verseNum === this.selectedVerseStart) {
						verseEl.addClass('selection-start');
					} else if (verseNum === this.selectedVerseEnd) {
						verseEl.addClass('selection-end');
					} else {
						verseEl.addClass('selection-middle');
					}
				} else {
					// Single verse
					verseEl.addClass('selection-single');
				}
			}
		});

		// Update floating selection badge
		this.updateSelectionBadge();
	}

	updateSelectionBadge() {
		// Remove existing badge
		const existingBadge = this.containerEl.querySelector('.selection-badge');
		if (existingBadge) existingBadge.remove();

		// Show badge for range selections
		if (this.selectedVerseStart !== null && this.selectedVerseEnd !== null && this.selectedVerseEnd !== this.selectedVerseStart) {
			const verseCount = this.selectedVerseEnd - this.selectedVerseStart + 1;
			const badge = this.containerEl.createDiv({ cls: 'selection-badge' });
			const iconSpan = badge.createSpan({ cls: 'selection-badge-icon' });
			setIcon(iconSpan, 'check-square');
			badge.createSpan({ text: `${verseCount} verses selected` });
		}
	}

	pushToHistory() {
		// Save current state to navigation history
		const currentState = {
			book: this.currentBook,
			chapter: this.currentChapter,
			viewMode: this.viewMode,
			lookupInput: this.lookupInput,
			strongsLookupInput: this.strongsLookupInput
		};

		// If we're not at the end of history, truncate forward history
		if (this.historyIndex < this.navigationHistory.length - 1) {
			this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
		}

		// Don't add duplicate consecutive states
		const lastState = this.navigationHistory[this.navigationHistory.length - 1];
		if (lastState &&
			lastState.book === currentState.book &&
			lastState.chapter === currentState.chapter &&
			lastState.viewMode === currentState.viewMode) {
			return;
		}

		this.navigationHistory.push(currentState);
		this.historyIndex = this.navigationHistory.length - 1;

		// Limit history size to prevent memory issues
		if (this.navigationHistory.length > 50) {
			this.navigationHistory.shift();
			this.historyIndex--;
		}
	}

	navigateBack() {
		if (this.historyIndex > 0) {
			this.historyIndex--;
			const state = this.navigationHistory[this.historyIndex];

			// Restore state
			this.currentBook = state.book;
			this.currentChapter = state.chapter;
			this.viewMode = state.viewMode;
			if (state.lookupInput) this.lookupInput = state.lookupInput;
			if (state.strongsLookupInput) this.strongsLookupInput = state.strongsLookupInput;

			// Don't push to history when navigating back
			const skipHistory = true;
			this.render(skipHistory);
		}
	}

	navigateForward() {
		if (this.historyIndex < this.navigationHistory.length - 1) {
			this.historyIndex++;
			const state = this.navigationHistory[this.historyIndex];

			// Restore state
			this.currentBook = state.book;
			this.currentChapter = state.chapter;
			this.viewMode = state.viewMode;
			if (state.lookupInput) this.lookupInput = state.lookupInput;
			if (state.strongsLookupInput) this.strongsLookupInput = state.strongsLookupInput;

			// Don't push to history when navigating forward
			const skipHistory = true;
			this.render(skipHistory);
		}
	}

	async render(skipHistory: boolean = false) {
		// Save to history before rendering (unless navigating through history)
		if (!skipHistory) {
			this.pushToHistory();
		}

		// Update status bar with current reference
		this.plugin.updateStatusBar(this.currentBook, this.currentChapter);

		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// Apply theme class to the view container for comprehensive theming
		const bannerTheme = this.plugin.settings.bannerTheme || 'parchment';

		// Remove any existing theme classes
		container.removeClass('theme-parchment', 'theme-holy-light', 'theme-royal', 'theme-sacrifice', 'theme-ocean', 'theme-custom');

		// Add current theme class to container for full plugin theming
		container.addClass(`bible-portal-view`, `theme-${bannerTheme}`);

		// Three-column layout: left sidebar + main + context sidebar (optional)
		const layout = container.createDiv({ cls: 'bible-portal-layout' });

		// Context sidebar only available in scripture reading modes
		const isScriptureMode = this.viewMode === ViewMode.CHAPTER ||
			this.viewMode === ViewMode.VERSE ||
			this.viewMode === ViewMode.PASSAGE;
		const showContextSidebar = this.plugin.settings.showContextSidebar && isScriptureMode;

		if (showContextSidebar) {
			layout.addClass('with-context-sidebar');
		}

		const sidebar = layout.createDiv({ cls: 'bible-portal-sidebar' });
		this.renderSidebarModes(sidebar);

		const mainArea = layout.createDiv({ cls: 'bible-portal-main' });
		const mainDiv = mainArea.createDiv({ cls: 'bible-portal-container' });

		// Context Sidebar (right side) - only in scripture reading modes
		if (showContextSidebar) {
			const contextSidebar = layout.createDiv({ cls: 'context-sidebar' });
			contextSidebar.style.width = `${this.plugin.settings.contextSidebarWidth}px`;
			this.renderContextSidebar(contextSidebar);
		}

		mainDiv.style.fontSize = `${this.plugin.settings.fontSize}px`;
		mainDiv.style.fontFamily = this.plugin.settings.fontFamily;
		if (this.plugin.settings.fontStyle === 'serif') {
			mainDiv.addClass('font-serif');
		}
		if (this.plugin.settings.readableLineLength) {
			mainDiv.addClass('readable-line-length');
		}

		// Banner (theme class applied to banner as well for gradient styling)
		const banner = mainDiv.createDiv({ cls: `bible-portal-banner theme-${bannerTheme}` });
		// Only apply custom color if theme is 'custom'
		if (bannerTheme === 'custom') {
			banner.style.setProperty('background', this.plugin.settings.bannerColor, 'important');
		}
		banner.createEl('h1', {
			text: `${this.plugin.settings.bannerIcon} Bible Portal`,
			cls: 'bible-portal-title'
		});

		// Verse of the Day (if enabled)
		if (this.plugin.settings.verseOfTheDayEnabled) {
			const votd = this.getVerseOfTheDay();
			if (votd) {
				const votdDiv = banner.createDiv({ cls: 'verse-of-the-day' });
				votdDiv.style.cursor = 'pointer';
				votdDiv.createEl('span', { text: 'Verse of the Day: ', cls: 'votd-label' });
				votdDiv.createEl('span', {
					text: `${votd.reference} - "${votd.text}"`,
					cls: 'votd-text'
				});

				// Make VOTD clickable - navigate to the verse
				votdDiv.addEventListener('click', () => {
					this.navigateToReference(votd.reference);
					showToast(`Navigated to ${votd.reference}`);
				});
			}
		}

		// Study Session Stats (if enabled)
		if (this.plugin.settings.enableSessionTracking) {
			const stats = this.plugin.getSessionStats();
			if (stats) {
				const sessionDiv = banner.createDiv({ cls: 'study-session-stats' });

				// Streak display
				if (this.plugin.settings.studyStreak > 0) {
					const streakEl = sessionDiv.createSpan({ cls: 'session-streak' });
					const streakIcon = streakEl.createSpan({ cls: 'session-stat-icon' });
					setIcon(streakIcon, 'flame');
					streakEl.createSpan({ text: `${this.plugin.settings.studyStreak} day streak`, cls: 'session-stat-text' });
				}

				// Session stats
				const statsContainer = sessionDiv.createDiv({ cls: 'session-stats-row' });

				// Duration
				const durationEl = statsContainer.createSpan({ cls: 'session-stat' });
				const durationIcon = durationEl.createSpan({ cls: 'session-stat-icon' });
				setIcon(durationIcon, 'clock');
				durationEl.createSpan({ text: `${stats.duration}m`, cls: 'session-stat-text', attr: { title: 'Session duration' } });

				// Chapters (clickable to show session details)
				const chaptersEl = statsContainer.createSpan({ cls: 'session-stat session-stat-clickable' });
				const chaptersIcon = chaptersEl.createSpan({ cls: 'session-stat-icon' });
				setIcon(chaptersIcon, 'book-open');
				chaptersEl.createSpan({ text: `${stats.chapters}`, cls: 'session-stat-text' });
				chaptersEl.setAttribute('title', 'Click to see session details');
				chaptersEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.showSessionDetailsPopup(stats);
				});

				// Notes
				if (stats.notes > 0) {
					const notesEl = statsContainer.createSpan({ cls: 'session-stat' });
					const notesIcon = notesEl.createSpan({ cls: 'session-stat-icon' });
					setIcon(notesIcon, 'sticky-note');
					notesEl.createSpan({ text: `${stats.notes}`, cls: 'session-stat-text', attr: { title: 'Notes created' } });
				}

				// Highlights
				if (stats.highlights > 0) {
					const highlightsEl = statsContainer.createSpan({ cls: 'session-stat' });
					const highlightsIcon = highlightsEl.createSpan({ cls: 'session-stat-icon' });
					setIcon(highlightsIcon, 'highlighter');
					highlightsEl.createSpan({ text: `${stats.highlights}`, cls: 'session-stat-text', attr: { title: 'Highlights added' } });
				}
			}
		}

		// Today's Reading Plan quick link (if enabled and active)
		if (this.plugin.settings.enableReadingPlan) {
			const todaysReadings = this.plugin.getTodaysReadings();

			if (todaysReadings.length > 0) {
				const quickLink = banner.createDiv({ cls: 'reading-plan-quick-link' });
				quickLink.setAttribute('title', 'Click to open Reading Plans');

				const iconSpan = quickLink.createSpan({ cls: 'quick-link-icon' });
				setIcon(iconSpan, 'book-open-check');

				const textSpan = quickLink.createSpan({ cls: 'quick-link-text' });

				// Count completed vs total
				const completedCount = todaysReadings.filter(r => r.completed).length;
				const totalCount = todaysReadings.length;

				if (completedCount === totalCount) {
					// All plans completed today
					textSpan.createSpan({ text: `✓ ${totalCount} plan${totalCount > 1 ? 's' : ''} done`, cls: 'completed' });
				} else if (totalCount === 1) {
					// Single plan - show details
					const reading = todaysReadings[0];
					textSpan.createSpan({ text: `Day ${reading.day}:` });
					textSpan.createSpan({
						text: ` ${reading.passages[0]}${reading.passages.length > 1 ? '...' : ''}`,
						cls: 'passage-preview'
					});
				} else {
					// Multiple plans - show summary
					textSpan.createSpan({ text: `${completedCount}/${totalCount} plans` });
					if (completedCount > 0) {
						textSpan.createSpan({ text: ' ✓', cls: 'partial-complete' });
					}
				}

				// Mini progress indicator - average of all active plans
				let avgProgress = 0;
				todaysReadings.forEach(r => {
					avgProgress += this.plugin.getReadingPlanProgress(r.plan.id);
				});
				avgProgress = Math.round(avgProgress / todaysReadings.length);
				const miniProgress = quickLink.createDiv({ cls: 'mini-progress' });
				const miniProgressFill = miniProgress.createDiv({ cls: 'mini-progress-fill' });
				miniProgressFill.style.width = `${avgProgress}%`;

				quickLink.addEventListener('click', () => {
					this.viewMode = ViewMode.READING_PLAN;
					void this.render();
				});
			}
		}

		// Onboarding hints for new users
		if (this.plugin.settings.showOnboarding && !this.plugin.settings.onboardingComplete) {
			const onboardingBar = mainDiv.createDiv({ cls: 'onboarding-hints-bar' });

			const hints = [
				{ icon: 'type', text: "Blue words have Strong's definitions - hover to see" },
				{ icon: 'heart', text: 'Red text shows words of Jesus' },
				{ icon: 'link', text: 'Click cross-reference icons to jump to related verses' },
				{ icon: 'mouse-pointer-click', text: 'Right-click verses for more options' }
			];

			const hintsContainer = onboardingBar.createDiv({ cls: 'onboarding-hints' });
			hints.forEach(hint => {
				const hintEl = hintsContainer.createDiv({ cls: 'onboarding-hint' });
				const iconSpan = hintEl.createSpan({ cls: 'onboarding-hint-icon' });
				setIcon(iconSpan, hint.icon);
				hintEl.createSpan({ text: hint.text, cls: 'onboarding-hint-text' });
			});

			const dismissBtn = onboardingBar.createEl('button', {
				cls: 'onboarding-dismiss-btn',
				attr: { 'aria-label': 'Dismiss hints' }
			});
			setIcon(dismissBtn, 'x');
			dismissBtn.addEventListener('click', async () => {
				this.plugin.settings.onboardingComplete = true;
				await this.plugin.saveSettings();
				onboardingBar.remove();
			});
		}

		// Render view mode content
		if (this.viewMode === ViewMode.CHAPTER) {
			await this.renderChapterMode(mainDiv);
		} else if (this.viewMode === ViewMode.VERSE) {
			this.renderVerseMode(mainDiv);
		} else if (this.viewMode === ViewMode.PASSAGE) {
			this.renderPassageMode(mainDiv);
		} else if (this.viewMode === ViewMode.STRONGS) {
			this.renderStrongsLookupMode(mainDiv);
		} else if (this.viewMode === ViewMode.PEOPLE_INDEX) {
			this.renderPeopleIndexMode(mainDiv);
		} else if (this.viewMode === ViewMode.MAP_VIEW) {
			this.renderMapViewMode(mainDiv);
		} else if (this.viewMode === ViewMode.TIMELINE_VIEW) {
			this.renderTimelineViewMode(mainDiv);
		} else if (this.viewMode === ViewMode.NOTES_BROWSER) {
			this.renderNotesBrowserMode(mainDiv);
		} else if (this.viewMode === ViewMode.HIGHLIGHTS_BROWSER) {
			this.renderHighlightsBrowserMode(mainDiv);
		} else if (this.viewMode === ViewMode.BOOKMARKS_BROWSER) {
			this.renderBookmarksBrowserMode(mainDiv);
		} else if (this.viewMode === ViewMode.CONCORDANCE) {
			this.renderConcordanceMode(mainDiv);
		} else if (this.viewMode === ViewMode.TAGS_BROWSER) {
			this.renderTagsBrowserMode(mainDiv);
		} else if (this.viewMode === ViewMode.COLLECTIONS) {
			this.renderCollectionsMode(mainDiv);
		} else if (this.viewMode === ViewMode.ACHIEVEMENTS) {
			this.renderAchievementsMode(mainDiv);
		} else if (this.viewMode === ViewMode.READING_PLAN) {
			this.renderReadingPlanMode(mainDiv);
		} else if (this.viewMode === ViewMode.STUDY_JOURNAL) {
			this.renderStudyJournalMode(mainDiv);
		} else if (this.viewMode === ViewMode.STUDY_INSIGHTS) {
			this.renderStudyInsightsMode(mainDiv);
		} else if (this.viewMode === ViewMode.COMPARISON_MATRIX) {
			this.renderComparisonMatrixMode(mainDiv);
		} else if (this.viewMode === ViewMode.MEMORIZATION) {
			this.renderMemorizationMode(mainDiv);
		}
	}

	async renderChapterMode(container: HTMLElement) {
		// Check if any Bible versions are actually loaded (check Map, not just settings)
		if (this.plugin.bibleVersions.size === 0) {
			this.renderNoBiblesState(container);
			return;
		}

		// Search bar (appears first, above nav)
		const searchBar = container.createDiv({ cls: 'bible-search-bar' });
		const searchInput = searchBar.createEl('input', {
			type: 'text',
			cls: 'bible-search-input',
			placeholder: 'Search for words or phrases...',
			attr: { 'aria-label': 'Search Bible text' }
		});
		const searchBtn = searchBar.createEl('button', { cls: 'bible-search-btn' });
		const searchIconSpan = searchBtn.createSpan({ cls: 'btn-icon' });
		setIcon(searchIconSpan, 'search');
		searchBtn.createSpan({ text: 'Search' });
		const scopeSelect = searchBar.createEl('select', { cls: 'bible-search-scope' });
		scopeSelect.createEl('option', { value: 'all', text: 'All books' });
		scopeSelect.createEl('option', { value: 'current-book', text: 'Current book' });
		scopeSelect.createEl('option', { value: 'current-chapter', text: 'Current chapter' });
		const defaultScope = this.plugin.settings.defaultSearchScope === 'book' ? 'current-book'
			: this.plugin.settings.defaultSearchScope === 'chapter' ? 'current-chapter'
			: 'all';
		scopeSelect.value = defaultScope;

		// Jump input (in search bar) - unified navigation for chapter/verse/passage
		const jumpInput = searchBar.createEl('input', {
			type: 'text',
			cls: 'bible-jump-input',
			placeholder: 'Go to... (John, John 3, John 3:16, John 3:16-21)',
			attr: { 'aria-label': 'Go to book, chapter, verse, or passage' }
		});
		const jumpBtn = searchBar.createEl('button', { text: '→ Go', cls: 'bible-jump-btn' });

		// ===== PRIMARY NAV BAR (always visible) =====
		const primaryNav = container.createDiv({ cls: 'bible-portal-nav bible-portal-nav-primary' });

		// Home button
		const homeVerseLabel = this.plugin.settings.homeVerse
			? `Go to home verse: ${this.plugin.settings.homeVerse}`
			: 'Go to home verse (not configured)';
		const homeBtn = primaryNav.createEl('button', {
			cls: 'bible-history-btn',
			attr: { 'aria-label': homeVerseLabel, 'title': homeVerseLabel }
		});
		setIcon(homeBtn, 'home');
		homeBtn.addEventListener('click', () => {
			if (this.plugin.settings.homeVerse) {
				this.navigateToReference(this.plugin.settings.homeVerse);
				showToast(`Navigated to home verse: ${this.plugin.settings.homeVerse}`);
			} else {
				showToast('No home verse configured. Set one in settings.');
			}
		});

		// Study Mode toggle button
		const studyModeBtn = primaryNav.createEl('button', {
			cls: `bible-study-mode-btn ${this.plugin.isStudyModeActive ? 'active' : ''}`,
			attr: {
				'aria-label': this.plugin.isStudyModeActive ? 'End study session' : 'Start study session',
				'title': this.plugin.isStudyModeActive ? 'End study session' : 'Start study session'
			}
		});
		setIcon(studyModeBtn, this.plugin.isStudyModeActive ? 'pause-circle' : 'play-circle');
		if (this.plugin.isStudyModeActive && this.plugin.currentSession) {
			const mins = Math.floor((Date.now() - this.plugin.currentSession.startTime) / 60000);
			studyModeBtn.createSpan({ text: ` ${mins}m`, cls: 'study-timer' });
		}
		studyModeBtn.addEventListener('click', () => {
			this.plugin.toggleStudyMode();
		});

		// Context Sidebar toggle button
		const contextBtn = primaryNav.createEl('button', {
			cls: `bible-context-btn ${this.plugin.settings.showContextSidebar ? 'active' : ''}`,
			attr: {
				'aria-label': this.plugin.settings.showContextSidebar ? 'Hide study context' : 'Show study context',
				'title': this.plugin.settings.showContextSidebar ? 'Hide study context' : 'Show study context'
			}
		});
		setIcon(contextBtn, 'panel-right');
		contextBtn.addEventListener('click', async () => {
			this.plugin.settings.showContextSidebar = !this.plugin.settings.showContextSidebar;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Chapter Actions button (bulk operations)
		const chapterActionsBtn = primaryNav.createEl('button', {
			cls: 'bible-chapter-actions-btn',
			attr: {
				'aria-label': 'Chapter actions',
				'title': 'Chapter actions (bulk move highlights)'
			}
		});
		setIcon(chapterActionsBtn, 'more-vertical');
		chapterActionsBtn.addEventListener('click', (e) => {
			const menu = new Menu();

			// Get highlights in current chapter
			const chapterHighlights = this.plugin.getHighlightsForChapter(this.currentBook, this.currentChapter);

			if (chapterHighlights.length > 0) {
				menu.addItem((item) => {
					item.setTitle(`Move all ${chapterHighlights.length} highlight${chapterHighlights.length !== 1 ? 's' : ''} in this chapter to...`);
					item.setDisabled(true);
				});

				menu.addSeparator();

				this.plugin.settings.annotationLayers.forEach(layer => {
					menu.addItem((item) => {
						item.setTitle(layer.name);
						item.setIcon('folder');
						item.onClick(async () => {
							for (const highlight of chapterHighlights) {
								highlight.layer = layer.id;
							}
							await this.plugin.saveHighlightsAndNotes();
							await this.render();
							showToast(`Moved ${chapterHighlights.length} highlight${chapterHighlights.length !== 1 ? 's' : ''} to ${layer.name} layer`);
						});
					});
				});
			} else {
				menu.addItem((item) => {
					item.setTitle('No highlights in this chapter');
					item.setDisabled(true);
				});
			}

			menu.showAtMouseEvent(e);
		});

		// Navigation history buttons (back/forward)
		const backBtn = primaryNav.createEl('button', {
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go back' }
		});
		setIcon(backBtn, 'chevron-left');
		backBtn.disabled = this.historyIndex <= 0;
		backBtn.addEventListener('click', () => {
			this.navigateBack();
		});

		const forwardBtn = primaryNav.createEl('button', {
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go forward' }
		});
		setIcon(forwardBtn, 'chevron-right');
		forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
		forwardBtn.addEventListener('click', () => {
			this.navigateForward();
		});

		// Separator
		primaryNav.createEl('span', { text: '|', cls: 'nav-separator' });

		// Book selector
		const bookSelect = primaryNav.createEl('select', { cls: 'bible-book-select' });
		const books = this.plugin.getBooksArray(this.currentVersion);
		books.forEach(book => {
			const option = bookSelect.createEl('option', { value: book, text: book });
			if (book === this.currentBook) {
				option.selected = true;
			}
		});
		bookSelect.addEventListener('change', (e) => {
			this.currentBook = (e.target as HTMLSelectElement).value;
			this.currentChapter = 1;
			void this.render();
		});

		// Chapter selector
		const chapterSelect = primaryNav.createEl('select', { cls: 'bible-chapter-select' });
		const chapters = this.plugin.getChaptersArray(this.currentVersion, this.currentBook);
		chapters.forEach(chapter => {
			const option = chapterSelect.createEl('option', {
				value: chapter.toString(),
				text: `Chapter ${chapter}`
			});
			if (chapter === this.currentChapter) {
				option.selected = true;
			}
		});
		chapterSelect.addEventListener('change', (e) => {
			this.currentChapter = parseInt((e.target as HTMLSelectElement).value);
			void this.render();
		});

		// Previous/Next buttons with cross-book navigation
		const prevBtn = primaryNav.createEl('button', { cls: 'bible-nav-btn' });
		setIcon(prevBtn, 'arrow-left');
		prevBtn.createSpan({ text: ' Prev' });
		prevBtn.addEventListener('click', () => {
			if (this.currentChapter > 1) {
				// Go to previous chapter in same book
				this.currentChapter--;
				void this.render();
			} else {
				// At chapter 1 - go to previous book's last chapter
				const books = this.plugin.getBooksArray(this.currentVersion);
				const currentBookIndex = books.indexOf(this.currentBook);

				let prevBookIndex: number;
				if (currentBookIndex <= 0) {
					// At Genesis - loop to Revelation (last book)
					prevBookIndex = books.length - 1;
				} else {
					prevBookIndex = currentBookIndex - 1;
				}

				const prevBook = books[prevBookIndex];
				const prevBookChapters = this.plugin.getChaptersArray(this.currentVersion, prevBook);
				const lastChapter = Math.max(...prevBookChapters);

				this.currentBook = prevBook;
				this.currentChapter = lastChapter;
				void this.render();
			}
		});

		const nextBtn = primaryNav.createEl('button', { cls: 'bible-nav-btn' });
		nextBtn.createSpan({ text: 'Next ' });
		setIcon(nextBtn, 'arrow-right');
		nextBtn.addEventListener('click', () => {
			const chapters = this.plugin.getChaptersArray(this.currentVersion, this.currentBook);
			const maxChapter = Math.max(...chapters);

			if (this.currentChapter < maxChapter) {
				// Go to next chapter in same book
				this.currentChapter++;
				void this.render();
			} else {
				// At last chapter - go to next book's first chapter
				const books = this.plugin.getBooksArray(this.currentVersion);
				const currentBookIndex = books.indexOf(this.currentBook);

				let nextBookIndex: number;
				if (currentBookIndex >= books.length - 1) {
					// At Revelation - loop to Genesis (first book)
					nextBookIndex = 0;
				} else {
					nextBookIndex = currentBookIndex + 1;
				}

				this.currentBook = books[nextBookIndex];
				this.currentChapter = 1;
				void this.render();
			}
		});

		// Spacer
		primaryNav.createDiv({ cls: 'nav-spacer' });

		// Toggle button for secondary nav
		const toggleSecondaryBtn = primaryNav.createEl('button', {
			cls: 'bible-toggle-secondary-btn',
			attr: { 'aria-label': 'Toggle options', 'title': 'Toggle options' }
		});
		setIcon(toggleSecondaryBtn, this.plugin.settings.showSecondaryNav ? 'chevron-up' : 'chevron-down');
		toggleSecondaryBtn.addEventListener('click', async () => {
			this.plugin.settings.showSecondaryNav = !this.plugin.settings.showSecondaryNav;
			await this.plugin.saveSettings();
			await this.render();
		});

		// ===== SECONDARY NAV BAR (collapsible) =====
		const secondaryNav = container.createDiv({
			cls: `bible-portal-nav bible-portal-nav-secondary ${this.plugin.settings.showSecondaryNav ? '' : 'collapsed'}`
		});

		// Version selector
		const versionSelect = secondaryNav.createEl('select', { cls: 'bible-version-select' });
		this.plugin.settings.bibleVersions.forEach(version => {
			const option = versionSelect.createEl('option', { value: version, text: version });
			if (version === this.currentVersion) option.selected = true;
		});
		versionSelect.addEventListener('change', (e) => {
			this.currentVersion = (e.target as HTMLSelectElement).value;
			void this.render();
		});

		// Parallel view toggle
		const parallelCheckbox = secondaryNav.createDiv({ cls: 'nav-checkbox parallel-checkbox-container' });

		// Hide parallel option when sidebar is hidden (narrow view)
		if (!this.sidebarVisible) {
			parallelCheckbox.style.display = 'none';
		}

		const parallelInput = parallelCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'parallel-check' } });
		parallelCheckbox.createEl('label', { text: 'Parallel view', attr: { for: 'parallel-check' } });
		parallelInput.checked = !!this.secondVersion;
		parallelInput.addEventListener('change', () => {
			if (parallelInput.checked) {
				// Enable parallel view - use second version from settings or default to first available
				const versions = this.plugin.settings.bibleVersions;
				this.secondVersion = versions.length > 1 ? versions[1] : versions[0];
			} else {
				this.secondVersion = null;
			}
			void this.render();
		});

		// Second version selector (only shown when parallel view is enabled)
		if (this.secondVersion) {
			secondaryNav.createEl('span', { text: '→', cls: 'parallel-separator' });
			const secondVersionSelect = secondaryNav.createEl('select', { cls: 'bible-version-select' });
			this.plugin.settings.bibleVersions.forEach(version => {
				const option = secondVersionSelect.createEl('option', { value: version, text: version });
				if (version === this.secondVersion) option.selected = true;
			});
			secondVersionSelect.addEventListener('change', (e) => {
				this.secondVersion = (e.target as HTMLSelectElement).value;
				void this.render();
			});

			// Sync scroll toggle
			const syncCheckbox = secondaryNav.createDiv({ cls: 'nav-checkbox sync-scroll-checkbox' });
			const syncInput = syncCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'sync-scroll-check' } });
			syncCheckbox.createEl('label', { text: 'Sync', attr: { for: 'sync-scroll-check' } });
			syncInput.checked = this.syncScroll;
			syncInput.addEventListener('change', () => {
				this.syncScroll = syncInput.checked;
			});
		}

		// Annotation Layer selector
		const layerGroup = secondaryNav.createDiv({ cls: 'nav-layer-group' });
		const layerIcon = layerGroup.createSpan({ cls: 'layer-icon' });
		setIcon(layerIcon, 'layers');

		// Active layer dropdown
		const layerSelect = layerGroup.createEl('select', {
			cls: 'layer-select',
			attr: { 'aria-label': 'Active annotation layer' }
		});
		this.plugin.settings.annotationLayers.forEach(layer => {
			const option = layerSelect.createEl('option', { value: layer.id, text: layer.name });
			if (layer.id === this.plugin.settings.activeAnnotationLayer) {
				option.selected = true;
			}
		});
		layerSelect.addEventListener('change', async (e) => {
			this.plugin.settings.activeAnnotationLayer = (e.target as HTMLSelectElement).value;
			await this.plugin.saveSettings();
		});

		// Layer visibility toggles (compact)
		const layerToggles = layerGroup.createDiv({ cls: 'layer-toggles' });
		this.plugin.settings.annotationLayers.forEach(layer => {
			const toggle = layerToggles.createEl('button', {
				cls: `layer-toggle ${this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'visible' : 'hidden'}`,
				attr: {
					'aria-label': `Toggle ${layer.name} visibility`,
					'title': layer.name
				}
			});
			toggle.style.setProperty('--layer-color', layer.color);
			const eyeIcon = toggle.createSpan({ cls: 'toggle-icon' });
			setIcon(eyeIcon, this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'eye' : 'eye-off');

			toggle.addEventListener('click', async () => {
				const idx = this.plugin.settings.visibleAnnotationLayers.indexOf(layer.id);
				if (idx > -1) {
					this.plugin.settings.visibleAnnotationLayers.splice(idx, 1);
				} else {
					this.plugin.settings.visibleAnnotationLayers.push(layer.id);
				}
				await this.plugin.saveSettings();
				await this.render();
			});
		});

		// Checkboxes group (right side of nav)
		const checkboxGroup = secondaryNav.createDiv({ cls: 'nav-checkbox-group' });

		// Strong's checkbox
		const strongsCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const strongsInput = strongsCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'strongs-check' } });
		strongsCheckbox.createEl('label', { text: "Strong's", attr: { for: 'strongs-check' } });
		strongsInput.checked = this.plugin.settings.enableStrongs;
		strongsInput.addEventListener('change', async () => {
			this.plugin.settings.enableStrongs = strongsInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Notes checkbox
		const notesCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const notesInput = notesCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'notes-check' } });
		notesCheckbox.createEl('label', { text: 'Notes', attr: { for: 'notes-check' } });
		notesInput.checked = this.plugin.settings.showNoteIndicators !== false;
		notesInput.addEventListener('change', async () => {
			this.plugin.settings.showNoteIndicators = notesInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Tags checkbox
		const tagsCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const tagsInput = tagsCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'tags-check' } });
		tagsCheckbox.createEl('label', { text: 'Tags', attr: { for: 'tags-check' } });
		tagsInput.checked = this.plugin.settings.showTagIndicators !== false;
		tagsInput.addEventListener('change', async () => {
			this.plugin.settings.showTagIndicators = tagsInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Tags filter dropdown (only show if tags are enabled)
		const allTags = this.plugin.getAllTagNames();
		if (allTags.length > 0 && this.plugin.settings.showTagIndicators !== false) {
			const tagsFilter = checkboxGroup.createDiv({ cls: 'nav-filter' });
			tagsFilter.createEl('label', { text: 'Tags:', cls: 'nav-filter-label' });
			const tagsSelect = tagsFilter.createEl('select', { cls: 'nav-filter-select' });

			// Add "All" option
			const allOption = tagsSelect.createEl('option', { value: '', text: 'All' });

			// Add each tag as an option
			allTags.forEach(tag => {
				const option = tagsSelect.createEl('option', { value: tag, text: tag });
				if (this.tagFilter === tag) {
					option.selected = true;
				}
			});

			tagsSelect.addEventListener('change', () => {
				this.tagFilter = tagsSelect.value || null;
				void this.render();
			});
		}

		// Wire up search and jump functionality
		searchBtn.addEventListener('click', () => {
			const query = searchInput.value.trim();
			const scope = scopeSelect.value;
			if (query) {
				this.performSearch(query, scope);
			}
		});

		searchInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				const query = searchInput.value.trim();
				const scope = scopeSelect.value;
				if (query) {
					this.performSearch(query, scope);
				}
			}
		});

		// Jump handler
		jumpBtn.addEventListener('click', () => {
			const reference = jumpInput.value.trim();
			if (reference) {
				this.jumpToPassage(reference);
			}
		});

		jumpInput.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				const reference = jumpInput.value.trim();
				if (reference) {
					this.jumpToPassage(reference);
				}
			}
		});

		// Chapter viewer(s)
		if (this.secondVersion) {
			// Parallel view
			const parallelContainer = container.createDiv({ cls: 'bible-parallel-container' });

			const leftPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
			leftPanel.dataset.version = this.currentVersion; // Track which version this panel shows
			await this.renderChapterViewer(leftPanel, this.currentVersion);

			const rightPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
			rightPanel.dataset.version = this.secondVersion; // Track which version this panel shows
			await this.renderChapterViewer(rightPanel, this.secondVersion);

			// Set up synchronized scrolling between panels
			this.setupParallelScrollSync(leftPanel, rightPanel);
		} else {
			// Single view - Theographic data is now in the Study Context sidebar (right panel)
			// The old inline theographic sidebar has been removed
			const chapterViewer = container.createDiv({ cls: 'bible-chapter-viewer' });
			await this.renderChapterViewer(chapterViewer, this.currentVersion);
		}
	}

	/**
	 * Render empty state when no Bible versions are installed
	 */
	renderNoBiblesState(container: HTMLElement) {
		const emptyState = container.createDiv({ cls: 'bible-empty-state' });

		const iconDiv = emptyState.createDiv({ cls: 'empty-state-icon' });
		setIcon(iconDiv, 'book-open');

		emptyState.createEl('h2', { text: 'No Bible Translations Installed', cls: 'empty-state-title' });

		emptyState.createEl('p', {
			text: 'Download a Bible translation to get started with Bible Portal.',
			cls: 'empty-state-desc'
		});

		// Progress container (hidden initially)
		const progressContainer = emptyState.createDiv({ cls: 'bible-download-progress', attr: { style: 'display: none;' } });
		const progressText = progressContainer.createEl('p', { cls: 'bible-download-progress-text' });
		const progressBarOuter = progressContainer.createDiv({ cls: 'bible-download-progress-bar-outer' });
		const progressBarInner = progressBarOuter.createDiv({ cls: 'bible-download-progress-bar-inner' });

		// Download button
		const downloadBtn = emptyState.createEl('button', {
			text: '📥 Download Bible Translation',
			cls: 'bible-download-btn mod-cta'
		});

		downloadBtn.addEventListener('click', async () => {
			// Show progress, hide button
			downloadBtn.style.display = 'none';
			progressContainer.style.display = 'block';
			progressText.textContent = 'Fetching available translations...';
			progressBarInner.style.width = '0%';

			await this.plugin.downloadBibleTranslation((step, message, percent) => {
				progressText.textContent = message;
				if (percent >= 0) {
					progressBarInner.style.width = `${percent}%`;
				}

				if (step === 'complete') {
					// Re-render to show Bible content
					setTimeout(() => void this.render(), 500);
				} else if (step === 'error') {
					// Show error and restore button
					progressContainer.style.display = 'none';
					downloadBtn.style.display = 'block';
				}
			});
		});

		// Settings link
		const settingsLink = emptyState.createEl('p', { cls: 'empty-state-hint' });
		settingsLink.createEl('span', { text: 'Or go to ' });
		const link = settingsLink.createEl('a', { text: 'Settings', href: '#' });
		link.addEventListener('click', (e) => {
			e.preventDefault();
			// Open settings
			(this.app as any).setting.open();
			(this.app as any).setting.openTabById('bible-portal');
		});
		settingsLink.createEl('span', { text: ' for more options.' });
	}

	renderVerseMode(container: HTMLElement) {
		// Search/Lookup bar (for verse lookup in this mode)
		const searchBar = container.createDiv({ cls: 'bible-search-bar' });
		searchBar.createEl('label', { text: 'Lookup verse (e.g., John 3:16):', cls: 'lookup-label' });

		const input = searchBar.createEl('input', {
			type: 'text',
			placeholder: 'Book Chapter:Verse',
			cls: 'lookup-input',
			value: this.lookupInput,
			attr: { 'aria-label': 'Verse reference' }
		});

		const lookupBtn = searchBar.createEl('button', { text: 'Lookup', cls: 'lookup-btn' });
		lookupBtn.addEventListener('click', () => {
			this.lookupInput = input.value;
			this.performVerseLookup();
		});

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.lookupInput = input.value;
				this.performVerseLookup();
			}
		});

		// Unified nav bar (below search/lookup)
		const navControls = container.createDiv({ cls: 'bible-portal-nav' });

		// Home button
		const homeVerseLabel = this.plugin.settings.homeVerse
			? `Go to home verse: ${this.plugin.settings.homeVerse}`
			: 'Go to home verse (not configured)';
		const homeBtn = navControls.createEl('button', {
			text: '🏠',
			cls: 'bible-history-btn',
			attr: { 'aria-label': homeVerseLabel, 'title': homeVerseLabel }
		});
		homeBtn.addEventListener('click', () => {
			if (this.plugin.settings.homeVerse) {
				this.navigateToReference(this.plugin.settings.homeVerse);
				showToast(`Navigated to home verse: ${this.plugin.settings.homeVerse}`);
			} else {
				showToast('No home verse configured. Set one in settings.');
			}
		});

		// Navigation history buttons (back/forward)
		const backBtn = navControls.createEl('button', {
			text: '◀',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go back' }
		});
		backBtn.disabled = this.historyIndex <= 0;
		backBtn.addEventListener('click', () => {
			this.navigateBack();
		});

		const forwardBtn = navControls.createEl('button', {
			text: '▶',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go forward' }
		});
		forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
		forwardBtn.addEventListener('click', () => {
			this.navigateForward();
		});

		// Separator
		navControls.createEl('span', { text: '|', cls: 'nav-separator' });

		// Version selector
		const versionSelect = navControls.createEl('select', { cls: 'bible-version-select' });
		this.plugin.settings.bibleVersions.forEach(version => {
			const option = versionSelect.createEl('option', { value: version, text: version });
			if (version === this.currentVersion) option.selected = true;
		});
		versionSelect.addEventListener('change', (e) => {
			this.currentVersion = (e.target as HTMLSelectElement).value;
			void this.render();
		});

		// Parallel view toggle
		const parallelCheckbox = navControls.createDiv({ cls: 'nav-checkbox' });
		const parallelInput = parallelCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'parallel-check-verse' } });
		parallelCheckbox.createEl('label', { text: 'Parallel view', attr: { for: 'parallel-check-verse' } });
		parallelInput.checked = !!this.secondVersion;
		parallelInput.addEventListener('change', () => {
			if (parallelInput.checked) {
				const versions = this.plugin.settings.bibleVersions;
				this.secondVersion = versions.length > 1 ? versions[1] : versions[0];
			} else {
				this.secondVersion = null;
			}
			void this.render();
		});

		// Second version selector (only shown when parallel view is enabled)
		if (this.secondVersion) {
			navControls.createEl('span', { text: '→', cls: 'parallel-separator' });
			const secondVersionSelect = navControls.createEl('select', { cls: 'bible-version-select' });
			this.plugin.settings.bibleVersions.forEach(version => {
				const option = secondVersionSelect.createEl('option', { value: version, text: version });
				if (version === this.secondVersion) option.selected = true;
			});
			secondVersionSelect.addEventListener('change', (e) => {
				this.secondVersion = (e.target as HTMLSelectElement).value;
				void this.render();
			});
		}

		// Annotation Layer selector
		const layerGroup = navControls.createDiv({ cls: 'nav-layer-group' });
		const layerIcon = layerGroup.createSpan({ cls: 'layer-icon' });
		setIcon(layerIcon, 'layers');

		const layerSelect = layerGroup.createEl('select', {
			cls: 'layer-select',
			attr: { 'aria-label': 'Active annotation layer' }
		});
		this.plugin.settings.annotationLayers.forEach(layer => {
			const option = layerSelect.createEl('option', { value: layer.id, text: layer.name });
			if (layer.id === this.plugin.settings.activeAnnotationLayer) {
				option.selected = true;
			}
		});
		layerSelect.addEventListener('change', async (e) => {
			this.plugin.settings.activeAnnotationLayer = (e.target as HTMLSelectElement).value;
			await this.plugin.saveSettings();
		});

		const layerToggles = layerGroup.createDiv({ cls: 'layer-toggles' });
		this.plugin.settings.annotationLayers.forEach(layer => {
			const toggle = layerToggles.createEl('button', {
				cls: `layer-toggle ${this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'visible' : 'hidden'}`,
				attr: { 'aria-label': `Toggle ${layer.name} visibility`, 'title': layer.name }
			});
			toggle.style.setProperty('--layer-color', layer.color);
			const eyeIcon = toggle.createSpan({ cls: 'toggle-icon' });
			setIcon(eyeIcon, this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'eye' : 'eye-off');

			toggle.addEventListener('click', async () => {
				const idx = this.plugin.settings.visibleAnnotationLayers.indexOf(layer.id);
				if (idx > -1) {
					this.plugin.settings.visibleAnnotationLayers.splice(idx, 1);
				} else {
					this.plugin.settings.visibleAnnotationLayers.push(layer.id);
				}
				await this.plugin.saveSettings();
				await this.render();
			});
		});

		// Checkboxes group
		const checkboxGroup = navControls.createDiv({ cls: 'nav-checkbox-group' });

		const strongsCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const strongsInput = strongsCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'strongs-check-verse' } });
		strongsCheckbox.createEl('label', { text: "Strong's", attr: { for: 'strongs-check-verse' } });
		strongsInput.checked = this.plugin.settings.enableStrongs;
		strongsInput.addEventListener('change', async () => {
			this.plugin.settings.enableStrongs = strongsInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		const notesCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const notesInput = notesCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'notes-check-verse' } });
		notesCheckbox.createEl('label', { text: 'Notes', attr: { for: 'notes-check-verse' } });
		notesInput.checked = this.plugin.settings.showNoteIndicators !== false;
		notesInput.addEventListener('change', async () => {
			this.plugin.settings.showNoteIndicators = notesInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Verse display
		if (this.lookupInput) {
			const parsed = this.parseVerseReference(this.lookupInput);
			if (parsed) {
				const verse = this.plugin.getVerseText(this.currentVersion, parsed.book, parsed.chapter, parsed.verse);
				if (verse) {
					// Use parallel container if second version is enabled
					if (this.secondVersion) {
						const parallelContainer = container.createDiv({ cls: 'bible-parallel-container' });

						// Left panel (primary version)
						const leftPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
						leftPanel.dataset.version = this.currentVersion;
						leftPanel.createEl('h3', {
							text: `${parsed.book} ${parsed.chapter}:${parsed.verse} (${this.currentVersion})`,
							cls: 'verse-reference'
						});
						const verseText1 = leftPanel.createEl('p', { text: verse, cls: 'verse-text-large' });
						verseText1.dataset.book = parsed.book;
						verseText1.dataset.chapter = parsed.chapter.toString();
						verseText1.dataset.verse = parsed.verse.toString();
						verseText1.style.cursor = 'pointer';

						// Add right-click context menu
						verseText1.addEventListener('contextmenu', (e) => {
							e.preventDefault();
							e.stopPropagation();
							this.showVerseContextMenu(e, parsed.book, parsed.chapter, parsed.verse, this.currentVersion);
						});

						// Right panel (second version)
						const verse2 = this.plugin.getVerseText(this.secondVersion, parsed.book, parsed.chapter, parsed.verse);
						if (verse2) {
							const rightPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
							rightPanel.dataset.version = this.secondVersion;
							rightPanel.createEl('h3', {
								text: `${parsed.book} ${parsed.chapter}:${parsed.verse} (${this.secondVersion})`,
								cls: 'verse-reference'
							});
							const verseText2 = rightPanel.createEl('p', { text: verse2, cls: 'verse-text-large' });
							verseText2.dataset.book = parsed.book;
							verseText2.dataset.chapter = parsed.chapter.toString();
							verseText2.dataset.verse = parsed.verse.toString();
							verseText2.style.cursor = 'pointer';

							// Add right-click context menu
							verseText2.addEventListener('contextmenu', (e) => {
								e.preventDefault();
								e.stopPropagation();
								this.showVerseContextMenu(e, parsed.book, parsed.chapter, parsed.verse, this.secondVersion ?? undefined);
							});
						}
					} else {
						// Single version display
						const verseDisplay = container.createDiv({ cls: 'bible-verse-display' });
						verseDisplay.createEl('h3', {
							text: `${parsed.book} ${parsed.chapter}:${parsed.verse} (${this.currentVersion})`,
							cls: 'verse-reference'
						});
						const verseText = verseDisplay.createEl('p', { text: verse, cls: 'verse-text-large' });
						verseText.dataset.book = parsed.book;
						verseText.dataset.chapter = parsed.chapter.toString();
						verseText.dataset.verse = parsed.verse.toString();
						verseText.style.cursor = 'pointer';

						// Add right-click context menu
						verseText.addEventListener('contextmenu', (e) => {
							e.preventDefault();
							e.stopPropagation();
							this.showVerseContextMenu(e, parsed.book, parsed.chapter, parsed.verse, this.currentVersion);
						});
					}
				} else {
					const verseDisplay = container.createDiv({ cls: 'bible-verse-display' });
					verseDisplay.createEl('p', { text: 'Verse not found', cls: 'bible-error' });
				}
			} else {
				const verseDisplay = container.createDiv({ cls: 'bible-verse-display' });
				verseDisplay.createEl('p', { text: 'Invalid format. Use: Book Chapter:Verse (e.g., John 3:16)', cls: 'bible-error' });
			}
		}
	}

	renderPassageMode(container: HTMLElement) {
		// Search/Lookup bar (for passage lookup in this mode)
		const searchBar = container.createDiv({ cls: 'bible-search-bar' });
		searchBar.createEl('label', { text: 'Lookup passage (e.g., John 3:16-21):', cls: 'lookup-label' });

		const input = searchBar.createEl('input', {
			type: 'text',
			placeholder: 'Book Chapter:StartVerse-EndVerse',
			cls: 'lookup-input',
			value: this.lookupInput,
			attr: { 'aria-label': 'Passage reference' }
		});

		const lookupBtn = searchBar.createEl('button', { text: 'Lookup', cls: 'lookup-btn' });
		lookupBtn.addEventListener('click', () => {
			this.lookupInput = input.value;
			this.performPassageLookup();
		});

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.lookupInput = input.value;
				this.performPassageLookup();
			}
		});

		// Unified nav bar (below search/lookup)
		const navControls = container.createDiv({ cls: 'bible-portal-nav' });

		// Home button
		const homeVerseLabel = this.plugin.settings.homeVerse
			? `Go to home verse: ${this.plugin.settings.homeVerse}`
			: 'Go to home verse (not configured)';
		const homeBtn = navControls.createEl('button', {
			text: '🏠',
			cls: 'bible-history-btn',
			attr: { 'aria-label': homeVerseLabel, 'title': homeVerseLabel }
		});
		homeBtn.addEventListener('click', () => {
			if (this.plugin.settings.homeVerse) {
				this.navigateToReference(this.plugin.settings.homeVerse);
				showToast(`Navigated to home verse: ${this.plugin.settings.homeVerse}`);
			} else {
				showToast('No home verse configured. Set one in settings.');
			}
		});

		// Navigation history buttons (back/forward)
		const backBtn = navControls.createEl('button', {
			text: '◀',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go back' }
		});
		backBtn.disabled = this.historyIndex <= 0;
		backBtn.addEventListener('click', () => {
			this.navigateBack();
		});

		const forwardBtn = navControls.createEl('button', {
			text: '▶',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go forward' }
		});
		forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
		forwardBtn.addEventListener('click', () => {
			this.navigateForward();
		});

		// Separator
		navControls.createEl('span', { text: '|', cls: 'nav-separator' });

		// Version selector
		const versionSelect = navControls.createEl('select', { cls: 'bible-version-select' });
		this.plugin.settings.bibleVersions.forEach(version => {
			const option = versionSelect.createEl('option', { value: version, text: version });
			if (version === this.currentVersion) option.selected = true;
		});
		versionSelect.addEventListener('change', (e) => {
			this.currentVersion = (e.target as HTMLSelectElement).value;
			void this.render();
		});

		// Parallel view toggle
		const parallelCheckbox = navControls.createDiv({ cls: 'nav-checkbox' });
		const parallelInput = parallelCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'parallel-check-passage' } });
		parallelCheckbox.createEl('label', { text: 'Parallel view', attr: { for: 'parallel-check-passage' } });
		parallelInput.checked = !!this.secondVersion;
		parallelInput.addEventListener('change', () => {
			if (parallelInput.checked) {
				const versions = this.plugin.settings.bibleVersions;
				this.secondVersion = versions.length > 1 ? versions[1] : versions[0];
			} else {
				this.secondVersion = null;
			}
			void this.render();
		});

		// Second version selector (only shown when parallel view is enabled)
		if (this.secondVersion) {
			navControls.createEl('span', { text: '→', cls: 'parallel-separator' });
			const secondVersionSelect = navControls.createEl('select', { cls: 'bible-version-select' });
			this.plugin.settings.bibleVersions.forEach(version => {
				const option = secondVersionSelect.createEl('option', { value: version, text: version });
				if (version === this.secondVersion) option.selected = true;
			});
			secondVersionSelect.addEventListener('change', (e) => {
				this.secondVersion = (e.target as HTMLSelectElement).value;
				void this.render();
			});
		}

		// Annotation Layer selector
		const layerGroup = navControls.createDiv({ cls: 'nav-layer-group' });
		const layerIcon = layerGroup.createSpan({ cls: 'layer-icon' });
		setIcon(layerIcon, 'layers');

		const layerSelect = layerGroup.createEl('select', {
			cls: 'layer-select',
			attr: { 'aria-label': 'Active annotation layer' }
		});
		this.plugin.settings.annotationLayers.forEach(layer => {
			const option = layerSelect.createEl('option', { value: layer.id, text: layer.name });
			if (layer.id === this.plugin.settings.activeAnnotationLayer) {
				option.selected = true;
			}
		});
		layerSelect.addEventListener('change', async (e) => {
			this.plugin.settings.activeAnnotationLayer = (e.target as HTMLSelectElement).value;
			await this.plugin.saveSettings();
		});

		const layerToggles = layerGroup.createDiv({ cls: 'layer-toggles' });
		this.plugin.settings.annotationLayers.forEach(layer => {
			const toggle = layerToggles.createEl('button', {
				cls: `layer-toggle ${this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'visible' : 'hidden'}`,
				attr: { 'aria-label': `Toggle ${layer.name} visibility`, 'title': layer.name }
			});
			toggle.style.setProperty('--layer-color', layer.color);
			const eyeIcon = toggle.createSpan({ cls: 'toggle-icon' });
			setIcon(eyeIcon, this.plugin.settings.visibleAnnotationLayers.includes(layer.id) ? 'eye' : 'eye-off');

			toggle.addEventListener('click', async () => {
				const idx = this.plugin.settings.visibleAnnotationLayers.indexOf(layer.id);
				if (idx > -1) {
					this.plugin.settings.visibleAnnotationLayers.splice(idx, 1);
				} else {
					this.plugin.settings.visibleAnnotationLayers.push(layer.id);
				}
				await this.plugin.saveSettings();
				await this.render();
			});
		});

		// Checkboxes group
		const checkboxGroup = navControls.createDiv({ cls: 'nav-checkbox-group' });

		const strongsCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const strongsInput = strongsCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'strongs-check-passage' } });
		strongsCheckbox.createEl('label', { text: "Strong's", attr: { for: 'strongs-check-passage' } });
		strongsInput.checked = this.plugin.settings.enableStrongs;
		strongsInput.addEventListener('change', async () => {
			this.plugin.settings.enableStrongs = strongsInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		const notesCheckbox = checkboxGroup.createDiv({ cls: 'nav-checkbox' });
		const notesInput = notesCheckbox.createEl('input', { type: 'checkbox', attr: { id: 'notes-check-passage' } });
		notesCheckbox.createEl('label', { text: 'Notes', attr: { for: 'notes-check-passage' } });
		notesInput.checked = this.plugin.settings.showNoteIndicators !== false;
		notesInput.addEventListener('change', async () => {
			this.plugin.settings.showNoteIndicators = notesInput.checked;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Passage display
		if (this.lookupInput) {
			const parsed = this.parsePassageReference(this.lookupInput);
			if (parsed) {
				if (this.secondVersion) {
					// Parallel view
					const parallelContainer = container.createDiv({ cls: 'bible-parallel-container' });

					const leftPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
					leftPanel.dataset.version = this.currentVersion; // Track which version this panel shows
					this.renderPassageViewer(leftPanel, this.currentVersion, parsed);

					const rightPanel = parallelContainer.createDiv({ cls: 'bible-parallel-panel' });
					rightPanel.dataset.version = this.secondVersion; // Track which version this panel shows
					this.renderPassageViewer(rightPanel, this.secondVersion, parsed);
				} else {
					// Single view
					const passageDisplay = container.createDiv({ cls: 'bible-passage-display' });
					this.renderPassageViewer(passageDisplay, this.currentVersion, parsed);
				}
			} else {
				const passageDisplay = container.createDiv({ cls: 'bible-passage-display' });
				passageDisplay.createEl('p', {
					text: 'Invalid format. Use: Book Chapter:StartVerse-EndVerse (e.g., John 3:16-21)',
					cls: 'bible-error'
				});
			}
		}
	}

	renderStrongsLookupMode(container: HTMLElement) {
		const lookupControls = container.createDiv({ cls: 'bible-lookup-controls strongs-lookup-controls' });

		// Navigation history buttons (back/forward)
		const navButtons = lookupControls.createDiv({ cls: 'strongs-nav-buttons' });
		const backBtn = navButtons.createEl('button', {
			text: '◀ Back',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go back' }
		});
		backBtn.disabled = this.historyIndex <= 0;
		backBtn.addEventListener('click', () => {
			this.navigateBack();
		});

		const forwardBtn = navButtons.createEl('button', {
			text: 'Forward ▶',
			cls: 'bible-history-btn',
			attr: { 'aria-label': 'Go forward' }
		});
		forwardBtn.disabled = this.historyIndex >= this.navigationHistory.length - 1;
		forwardBtn.addEventListener('click', () => {
			this.navigateForward();
		});

		lookupControls.createEl('h2', { text: "Strong's Concordance Lookup", cls: 'strongs-lookup-title' });
		lookupControls.createEl('p', {
			text: 'Enter a Strong\'s number (e.g., H430 for Hebrew or G25 for Greek)',
			cls: 'strongs-lookup-description'
		});

		const inputContainer = lookupControls.createDiv({ cls: 'lookup-input-container' });
		const input = inputContainer.createEl('input', {
			type: 'text',
			placeholder: 'H430 or G25',
			cls: 'lookup-input strongs-lookup-input',
			value: this.strongsLookupInput
		});

		const lookupBtn = inputContainer.createEl('button', { text: 'Lookup', cls: 'lookup-btn' });
		lookupBtn.addEventListener('click', () => {
			this.strongsLookupInput = input.value.toUpperCase().trim();
			this.performStrongsLookup();
		});

		input.addEventListener('keypress', (e) => {
			if (e.key === 'Enter') {
				this.strongsLookupInput = input.value.toUpperCase().trim();
				this.performStrongsLookup();
			}
		});

		// Display result
		if (this.strongsLookupInput) {
			const resultContainer = container.createDiv({ cls: 'strongs-lookup-result' });

			const entry = this.plugin.getStrongsDefinition(this.strongsLookupInput);

			if (entry) {
				// Display the full Strong's entry
				const entryDiv = resultContainer.createDiv({ cls: 'strongs-entry-display' });

				// Make content selectable
				entryDiv.style.userSelect = 'text';

				// Strong's number header
				entryDiv.createEl('h3', {
					text: this.strongsLookupInput,
					cls: 'strongs-number-header'
				});

				// Original word (large)
				entryDiv.createEl('div', {
					text: entry.lemma,
					cls: 'strongs-original-word'
				});

				// Transliteration (+ pronunciation for Hebrew)
				const translitPronText = 'translit' in entry
					? entry.translit
					: `${entry.xlit} (${entry.pron})`;
				entryDiv.createEl('div', {
					text: translitPronText,
					cls: 'strongs-transliteration'
				});

				// Strong's definition
				const defSection = entryDiv.createDiv({ cls: 'strongs-definition-section' });
				defSection.createEl('h4', { text: 'Definition:' });
				defSection.createEl('p', { text: entry.strongs_def });

				// KJV definition
				const kjvSection = entryDiv.createDiv({ cls: 'strongs-kjv-section' });
				kjvSection.createEl('h4', { text: 'KJV Translation:' });
				kjvSection.createEl('p', { text: entry.kjv_def });

				// Derivation/Etymology
				if (entry.derivation) {
					const derivSection = entryDiv.createDiv({ cls: 'strongs-derivation-section' });
					derivSection.createEl('h4', { text: 'Etymology:' });

					// Render with clickable Strong's references
					const derivContent = derivSection.createDiv();
					this.renderDerivationWithLinks(derivContent, entry.derivation);
				}

				// Find verses using this Strong's number
				const versesUsingThis = this.plugin.findVersesWithStrongsNumber(this.strongsLookupInput);

				if (versesUsingThis.length > 0) {
					const versesSection = entryDiv.createDiv({ cls: 'strongs-verses-section' });
					versesSection.createEl('h4', { text: `Verses Using This Word (${versesUsingThis.length}):` });

					const versesList = versesSection.createDiv({ cls: 'strongs-verses-list' });

					// Group by book for better organization
					const byBook: {[book: string]: Array<{chapter: number, verse: number}>} = {};
					versesUsingThis.forEach(v => {
						if (!byBook[v.book]) byBook[v.book] = [];
						byBook[v.book].push({chapter: v.chapter, verse: v.verse});
					});

					// Display grouped by book with collapsible sections
					Object.entries(byBook).forEach(([book, verses]) => {
						const bookDiv = versesList.createDiv({ cls: 'strongs-book-group' });

						// Clickable book header
						const bookHeader = bookDiv.createEl('div', {
							cls: 'strongs-book-header collapsible'
						});

						const toggleIcon = bookHeader.createEl('span', {
							text: '▶',
							cls: 'strongs-toggle-icon'
						});

						bookHeader.createEl('span', {
							text: ` ${book} (${verses.length} verse${verses.length !== 1 ? 's' : ''})`
						});

						// Verses container (initially hidden)
						const versesContainer = bookDiv.createDiv({
							cls: 'strongs-verses-container collapsed'
						});

						// Add all verses (not just first 10)
						verses.forEach(v => {
							const verseRef = versesContainer.createEl('a', {
								text: `${v.chapter}:${v.verse}`,
								cls: 'strongs-verse-ref',
								href: '#'
							});
							verseRef.addEventListener('click', (e) => {
								e.preventDefault();
								this.currentBook = book;
								this.currentChapter = v.chapter;
								this.viewMode = ViewMode.CHAPTER;
								void this.render();
								// Scroll to verse after render
								setTimeout(() => {
									const verseEl = this.containerEl.querySelector(`[data-verse="${v.verse}"]`);
									if (verseEl) verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
								}, 100);
							});
						});

						// Toggle expand/collapse on header click
						bookHeader.addEventListener('click', () => {
							const isCollapsed = versesContainer.hasClass('collapsed');

							if (isCollapsed) {
								versesContainer.removeClass('collapsed');
								toggleIcon.setText('▼');
							} else {
								versesContainer.addClass('collapsed');
								toggleIcon.setText('▶');
							}
						});
					});
				}

				// Copy button
				const copyBtn = entryDiv.createEl('button', {
					text: '📋 Copy to Clipboard',
					cls: 'strongs-copy-btn'
				});
				copyBtn.addEventListener('click', () => {
					const copyText = [
						`${this.strongsLookupInput} - ${entry.lemma}`,
						translitPronText,
						'',
						entry.strongs_def,
						'',
						`KJV: ${entry.kjv_def}`,
						'',
						entry.derivation ? `Etymology: ${entry.derivation}` : ''
					].filter(line => line).join('\n');

					navigator.clipboard.writeText(copyText).then(() => {
						copyBtn.setText('✓ Copied!');
						setTimeout(() => copyBtn.setText('📋 Copy to Clipboard'), 2000);
					}).catch(() => showToast('Failed to copy to clipboard'));
				});

			} else {
				// Not found
				resultContainer.createEl('p', {
					text: `Strong's number "${this.strongsLookupInput}" not found. Please check the number and try again.`,
					cls: 'bible-error'
				});

				// Helpful hints
				const hintsDiv = resultContainer.createDiv({ cls: 'strongs-hints' });
				hintsDiv.createEl('p', { text: 'Tips:' });
				const hintsList = hintsDiv.createEl('ul');
				hintsList.createEl('li', { text: 'Hebrew numbers: H1 to H8674' });
				hintsList.createEl('li', { text: 'Greek numbers: G1 to G5624' });
				hintsList.createEl('li', { text: 'Format: H430 or G25 (letter + number)' });
			}
		}
	}

	performStrongsLookup() {
		void this.render();
	}

	async renderChapterViewer(container: HTMLElement, version: string) {

		const chapter = this.plugin.getChapter(version, this.currentBook, this.currentChapter);

		// Track chapter visit for study session
		this.plugin.trackChapterVisit(this.currentBook, this.currentChapter);

		if (chapter) {
			// Chapter heading with note buttons and bulk actions
			const headingContainer = container.createDiv({ cls: 'bible-chapter-header' });

			// Heading text
			headingContainer.createEl('h2', {
				text: `${this.currentBook} ${this.currentChapter} (${version})`,
				cls: 'bible-chapter-heading'
			});

			// Note buttons container (book and chapter notes)
			const noteButtonsContainer = headingContainer.createDiv({ cls: 'chapter-note-buttons' });

			// Book note button/indicator
			let currentBookNoteRefs = this.plugin.noteReferences.filter(n =>
				n.book === this.currentBook && n.noteLevel === 'book'
			);

			// Apply note type filter if active
			if (this.noteTypeFilter) {
				currentBookNoteRefs = currentBookNoteRefs.filter(n => n.noteType === this.noteTypeFilter);
			}

			// Apply tag filter if active
			if (this.tagFilter) {
				const filteredByTag: NoteReference[] = [];
				for (const noteRef of currentBookNoteRefs) {
					const tags = await this.plugin.getNoteTags(noteRef.notePath);
					if (tags.includes(this.tagFilter)) {
						filteredByTag.push(noteRef);
					}
				}
				currentBookNoteRefs = filteredByTag;
			}

			if (currentBookNoteRefs.length > 0) {
				// Container for note button + delete button
				const bookNoteGroup = noteButtonsContainer.createDiv({ cls: 'note-button-group' });

				// Get note type icon (default to 'study' if not set for backward compatibility)
				const bookNoteType = currentBookNoteRefs[0].noteType || 'personal';
				const bookNoteTypeInfo = NOTE_TYPES.find(t => t.type === bookNoteType);
				const bookTypeIcon = bookNoteTypeInfo?.icon || '📝';
				const bookTypeLabel = bookNoteTypeInfo?.label || 'Study';

				const bookNoteBtn = bookNoteGroup.createEl('button', {
					text: `${bookTypeIcon} Book Note (${bookTypeLabel})`,
					cls: 'note-action-btn note-exists-btn'
				});
				bookNoteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					const notePath = currentBookNoteRefs[0].notePath;
					const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
					if (file) {
						const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
						await leaf.openFile(file as any);
					}
				});

				// Delete button
				const deleteBookNoteBtn = bookNoteGroup.createEl('button', {
					cls: 'note-delete-btn',
					attr: { title: 'Delete book note' }
				});
				setIcon(deleteBookNoteBtn, 'trash-2');
				deleteBookNoteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					const notePath = currentBookNoteRefs[0].notePath;
					const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
					if (file) {
						await this.plugin.app.vault.delete(file);
					}
					this.plugin.removeNoteReference(this.currentBook, 0, 0);
					await this.render();
					showToast('Book note deleted');
				});
			} else {
				const createBookNoteBtn = noteButtonsContainer.createEl('button', {
					cls: 'note-action-btn note-create-btn'
				});
				const bookNoteIcon = createBookNoteBtn.createSpan({ cls: 'btn-icon' });
				setIcon(bookNoteIcon, 'book-marked');
				createBookNoteBtn.createSpan({ text: 'Create book note' });
				createBookNoteBtn.addEventListener('click', async (e) => {
					console.debug('📚 Create book note button clicked!');
					e.stopPropagation();
					await this.createBookNote(this.currentBook);
				});
			}

			// Chapter note button/indicator
			let currentChapterNoteRefs = this.plugin.noteReferences.filter(n =>
				n.book === this.currentBook &&
				n.chapter === this.currentChapter &&
				n.noteLevel === 'chapter'
			);

			// Apply note type filter if active
			if (this.noteTypeFilter) {
				currentChapterNoteRefs = currentChapterNoteRefs.filter(n => n.noteType === this.noteTypeFilter);
			}

			// Apply tag filter if active
			if (this.tagFilter) {
				const filteredByTag: NoteReference[] = [];
				for (const noteRef of currentChapterNoteRefs) {
					const tags = await this.plugin.getNoteTags(noteRef.notePath);
					if (tags.includes(this.tagFilter)) {
						filteredByTag.push(noteRef);
					}
				}
				currentChapterNoteRefs = filteredByTag;
			}

			if (currentChapterNoteRefs.length > 0) {
				// Container for note button + delete button
				const chapterNoteGroup = noteButtonsContainer.createDiv({ cls: 'note-button-group' });

				// Get note type icon (default to 'study' if not set for backward compatibility)
				const chapterNoteType = currentChapterNoteRefs[0].noteType || 'personal';
				const chapterNoteTypeInfo = NOTE_TYPES.find(t => t.type === chapterNoteType);
				const chapterTypeIcon = chapterNoteTypeInfo?.icon || '📝';
				const chapterTypeLabel = chapterNoteTypeInfo?.label || 'Study';

				const chapterNoteBtn = chapterNoteGroup.createEl('button', {
					text: `${chapterTypeIcon} Chapter Note (${chapterTypeLabel})`,
					cls: 'note-action-btn note-exists-btn'
				});
				chapterNoteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					const notePath = currentChapterNoteRefs[0].notePath;
					const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
					if (file) {
						const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
						await leaf.openFile(file as any);
					}
				});

				// Delete button
				const deleteChapterNoteBtn = chapterNoteGroup.createEl('button', {
					cls: 'note-delete-btn',
					attr: { title: 'Delete chapter note' }
				});
				setIcon(deleteChapterNoteBtn, 'trash-2');
				deleteChapterNoteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					const notePath = currentChapterNoteRefs[0].notePath;
					const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
					if (file) {
						await this.plugin.app.vault.delete(file);
					}
					this.plugin.removeNoteReference(this.currentBook, this.currentChapter, 0);
					await this.render();
					showToast('Chapter note deleted');
				});
			} else {
				const createChapterNoteBtn = noteButtonsContainer.createEl('button', {
					cls: 'note-action-btn note-create-btn'
				});
				const chapterNoteIcon = createChapterNoteBtn.createSpan({ cls: 'btn-icon' });
				setIcon(chapterNoteIcon, 'book-open');
				createChapterNoteBtn.createSpan({ text: 'Create chapter note' });
				createChapterNoteBtn.addEventListener('click', async (e) => {
					e.stopPropagation();
					await this.createChapterNote(this.currentBook, this.currentChapter);
				});
			}

			// Add bulk action buttons
			const bulkActionsDiv = headingContainer.createDiv({ cls: 'chapter-bulk-actions' });

			// Count highlights in this chapter (only visible layers)
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
			const chapterHighlights = this.plugin.highlights.filter(h => {
				if (h.book !== this.currentBook || h.chapter !== this.currentChapter) return false;
				const highlightLayer = h.layer || 'personal';
				return visibleLayers.includes(highlightLayer);
			});

			// Add highlight filter dropdown if there are highlights
			if (chapterHighlights.length > 0) {
				const filterSelect = bulkActionsDiv.createEl('select', {
					cls: 'highlight-filter-select'
				});

				// All highlights option
				const allOption = filterSelect.createEl('option', {
					text: `All highlights (${chapterHighlights.length})`,
					value: 'all'
				});

				// Color-specific options
				const colorCounts: { [color: string]: number } = {};
				chapterHighlights.forEach(h => {
					colorCounts[h.color] = (colorCounts[h.color] || 0) + 1;
				});

				Object.entries(colorCounts).forEach(([color, count]) => {
					const colorName = this.plugin.settings.highlightColors.find(c => c.color === color)?.name || 'Unknown';
					const option = filterSelect.createEl('option', {
						text: `${colorName} (${count})`,
						value: color
					});
				});

				// Filter handler
				filterSelect.addEventListener('change', (e) => {
					const selectedColor = (e.target as HTMLSelectElement).value;
					if (selectedColor === 'all') {
						showToast('Showing all highlights');
						void this.render();
					} else {
						const colorName = this.plugin.settings.highlightColors.find(c => c.color === selectedColor)?.name || 'Color';
						showToast(`Filtering by ${colorName}`);
						// TODO: Implement actual filtering - for now just shows toast
						// Would need to store filter state and apply during rendering
					}
				});
			}

			if (chapterHighlights.length > 0) {
				const clearBtn = bulkActionsDiv.createEl('button', {
					cls: 'bulk-action-btn'
				});
				const clearIcon = clearBtn.createSpan({ cls: 'btn-icon' });
				setIcon(clearIcon, 'trash-2');
				clearBtn.createSpan({ text: `Clear all (${chapterHighlights.length})` });
				clearBtn.addEventListener('click', async () => {
					await Promise.all(chapterHighlights.map(h => this.plugin.removeHighlight(h.id)));
					await this.renderAndScrollToVerse(1);
					showToast(`Cleared ${chapterHighlights.length} highlight(s) from this chapter`);
				});
			}

			// Verses - wrap in scrollable container so only verses scroll, not headers
			const verses = chapter.verses;
			const headings = chapter.headings || {};

			const versesContainer = container.createDiv({ cls: 'bible-verses-scrollable' });

			// Add scroll listener for sticky header shadow
			versesContainer.addEventListener('scroll', () => {
				if (versesContainer.scrollTop > 10) {
					headingContainer.addClass('is-scrolled');
				} else {
					headingContainer.removeClass('is-scrolled');
				}
			});

			for (const verseNum of Object.keys(verses)) {
				// Check if this verse has a section heading
				if (headings[verseNum]) {
					const headingDiv = versesContainer.createDiv({ cls: 'bible-section-heading' });
					headingDiv.createEl('h3', {
						text: headings[verseNum],
						cls: 'section-heading-text'
					});
				}

				const verseDiv = versesContainer.createDiv({ cls: 'bible-verse' });

				// Verse number with style variation
				const verseNumStyle = this.plugin.settings.verseNumberStyle || 'default';
				const verseNumber = verseDiv.createEl('span', {
					text: verseNum,
					cls: `bible-verse-number verse-num-${verseNumStyle}`
				});

				// Add verse number as data attribute for selection
				const verseNumInt = parseInt(verseNum);
				verseDiv.setAttribute('data-verse', verseNum);

				// Check for disputed/textual variant passage
				const disputedInfo = this.plugin.getDisputedPassageInfo(this.currentBook, this.currentChapter, verseNumInt);
				if (disputedInfo) {
					verseDiv.addClass('disputed-passage');
					// Add indicator icon
					const disputedIcon = verseDiv.createSpan({ cls: 'disputed-icon', attr: { 'aria-label': 'Disputed passage' } });
					setIcon(disputedIcon, 'alert-circle');
					// Add tooltip with info
					if (this.plugin.settings.showDisputedTooltips) {
						disputedIcon.setAttribute('title', `${disputedInfo.name}\n\n${disputedInfo.description}\n\n${disputedInfo.manuscriptInfo}`);
					}
				}

				// Apply tag filter highlighting (only if tags are enabled)
				if (this.tagFilter && this.plugin.settings.showTagIndicators !== false) {
					const verseTags = this.plugin.getTagsForVerse(this.currentBook, this.currentChapter, verseNumInt);
					const hasFilteredTag = verseTags.some(t => t.tag === this.tagFilter);
					if (hasFilteredTag) {
						verseDiv.addClass('verse-tag-filtered');
					} else {
						verseDiv.addClass('verse-tag-dimmed');
					}
				}

				// Handle verse click - show note preview and verse selection
				verseNumber.style.cursor = 'pointer';
				verseNumber.addEventListener('click', (e) => {
					e.stopPropagation();

					if (e.shiftKey && this.selectedVerseStart !== null) {
						// Shift-click: complete range selection
						this.selectedVerseEnd = verseNumInt;

						// Ensure start < end
						if (this.selectedVerseStart > this.selectedVerseEnd) {
							[this.selectedVerseStart, this.selectedVerseEnd] = [this.selectedVerseEnd, this.selectedVerseStart];
						}

						// Update selection visually without re-rendering
						this.updateVerseSelection();
						showToast(`Selected verses ${this.selectedVerseStart}-${this.selectedVerseEnd}`);
					} else {
						// Regular click: select verse and show note preview
						this.selectedVerseStart = verseNumInt;
						this.selectedVerseEnd = null;
						this.previewVerse = verseNumInt;

						// Update selection visually without re-rendering
						this.updateVerseSelection();

						// Update note preview in sidebar
						this.updateNotePreview();
					}
				});

				// Verse text - handle both string (ESV/NIV) and StrongsVerse (BSB) formats
				const verseData = verses[verseNum];
				const verseText = typeof verseData === 'string' ? verseData : verseData.text;
				const verseTextSpan = verseDiv.createEl('span', {
					cls: 'bible-verse-text'
				});

				// Check for highlights on this verse
				const highlights = this.plugin.getHighlightsForVerse(this.currentBook, this.currentChapter, verseNumInt);
				let noteRefs = this.plugin.getNoteReferencesForVerse(this.currentBook, this.currentChapter, verseNumInt);

				// Apply note type filter if active
				if (this.noteTypeFilter) {
					noteRefs = noteRefs.filter(n => n.noteType === this.noteTypeFilter);
				}

				// Apply tag filter if active
				if (this.tagFilter) {
					const filteredByTag: NoteReference[] = [];
					for (const noteRef of noteRefs) {
						const tags = await this.plugin.getNoteTags(noteRef.notePath);
						if (tags.includes(this.tagFilter)) {
							filteredByTag.push(noteRef);
						}
					}
					noteRefs = filteredByTag;
				}

				// Apply highlights if any exist
				if (highlights.length > 0) {
					// For now, apply the first highlight's color to the entire verse
					// TODO: Implement word-level highlighting using offsets
					const highlight = highlights[0];
					const style = this.plugin.settings.highlightStyle || 'handdrawn';

					// Set CSS custom property for the highlight color
					verseTextSpan.style.setProperty('--highlight-color', highlight.color);

					if (style === 'handdrawn') {
						// Hand-drawn marker style - CSS class handles the effect
						verseTextSpan.addClass('highlight-handdrawn');
						// Add subtle variation by using verse number as seed
						const variation = verseNumInt % 5;
						verseTextSpan.setAttribute('data-highlight-variation', String(variation));
					} else if (style === 'gradient') {
						// Gradient style: right to left fade
						verseTextSpan.addClass('highlight-gradient');
					} else {
						// Solid color
						verseTextSpan.addClass('highlight-solid');
					}

					// Add layer badge
					const layerId = highlight.layer || 'personal';
					const layer = this.plugin.settings.annotationLayers.find(l => l.id === layerId);
					if (layer) {
						const layerBadge = verseDiv.createSpan({ cls: 'layer-badge' });
						layerBadge.style.backgroundColor = layer.color;
						layerBadge.setAttribute('aria-label', layer.name);
						layerBadge.setAttribute('title', `Layer: ${layer.name}`);
						layerBadge.addEventListener('click', (e) => {
							e.stopPropagation();
							// Toggle visibility to show only this layer
							this.plugin.settings.visibleAnnotationLayers = [layerId];
							void this.plugin.saveSettings();
							void this.render();
							showToast(`Showing only "${layer.name}" layer`);
						});
					}
				}

				// Check if this verse contains Jesus' words (simple boolean check)
			const isJesusWords = this.plugin.isJesusWords(this.currentBook, this.currentChapter, verseNumInt);

			// Render verse text with Strong's tagging if available (BSB only)
			if (typeof verseData !== 'string' && verseData.strongs && this.plugin.settings.enableStrongs && this.plugin.strongsDictionary) {
				// BSB with Strong's tagging - render each word with hover tooltips
				this.renderStrongsVerse(verseTextSpan, verseData);
			} else if (this.plugin.settings.enableStrongs && this.plugin.strongsDictionary) {
				// Regular text (ESV/NIV) with interlinear data - render with hover tooltips
				await this.renderInterlinearVerse(verseTextSpan, verseText, this.currentBook, this.currentChapter, verseNumInt);
			} else {
				// No Strong's enabled - just show regular text
				verseTextSpan.setText(verseText);
			}

			// Apply Jesus Words red color styling if this verse contains Jesus' words
			if (isJesusWords && this.plugin.settings.enableJesusWords) {
				// Apply red color to indicate Jesus' direct speech
				if (typeof verseData !== 'string' && verseData.strongs) {
					// Strong's words exist - apply red to all .strongs-word elements
					const strongsWords = verseTextSpan.querySelectorAll('.strongs-word');
					strongsWords.forEach((word: HTMLElement) => {
						word.style.color = this.plugin.settings.jesusWordsColor;
						word.addClass('jesus-words');
					});
				} else {
					// No Strong's - wrap entire verse in red span
					const jesusSpan = verseTextSpan.createEl('span', {
						cls: 'jesus-words'
					});
					// Move all child nodes to the new span
					while (verseTextSpan.firstChild && verseTextSpan.firstChild !== jesusSpan) {
						jesusSpan.appendChild(verseTextSpan.firstChild);
					}
					jesusSpan.style.color = this.plugin.settings.jesusWordsColor;
				}
			}

				// Apply selection styling if verse is in selected range
				if (this.selectedVerseStart !== null) {
					const isSelected = this.selectedVerseEnd !== null
						? (verseNumInt >= this.selectedVerseStart && verseNumInt <= this.selectedVerseEnd)
						: (verseNumInt === this.selectedVerseStart);

					if (isSelected) {
						verseDiv.addClass('verse-selected');

						// Enhanced range selection classes
						if (this.selectedVerseEnd !== null && this.selectedVerseEnd !== this.selectedVerseStart) {
							// Multi-verse range
							if (verseNumInt === this.selectedVerseStart) {
								verseDiv.addClass('selection-start');
							} else if (verseNumInt === this.selectedVerseEnd) {
								verseDiv.addClass('selection-end');
							} else {
								verseDiv.addClass('selection-middle');
							}
						} else {
							// Single verse
							verseDiv.addClass('selection-single');
						}
					}
				}

				// Add right-click context menu to entire verse
				verseDiv.addEventListener('contextmenu', (e) => {
					console.debug('🖱️ RIGHT-CLICK on verse:', this.currentBook, this.currentChapter, verseNumInt);
					e.preventDefault();
					e.stopPropagation();

					// Detect which version was clicked in parallel view
					let clickedVersion = version; // Use the version from renderChapterViewer parameter
					const parallelPanel = (e.target as HTMLElement).closest('.bible-parallel-panel') as HTMLElement;
					if (parallelPanel && parallelPanel.dataset.version) {
						clickedVersion = parallelPanel.dataset.version;
					}

					this.showVerseContextMenu(e, this.currentBook, this.currentChapter, verseNumInt, clickedVersion);
				});

				// Add indicators
				const actionsDiv = verseDiv.createEl('span', { cls: 'verse-actions' });

				// Add indicators for notes/highlights
				// Note: No indicator icon for highlights - the background color is the indicator

				if (this.plugin.settings.showNoteIndicators && noteRefs.length > 0) {
					// Create a separate clickable icon for each note
					const levelOrder = ['verse', 'passage', 'chapter', 'book'];
					levelOrder.forEach(level => {
						const levelNotes = noteRefs.filter(n => n.noteLevel === level);
						levelNotes.forEach(note => {
							const noteType = note.noteType || 'personal';
							const noteTypeInfo = NOTE_TYPES.find(t => t.type === noteType);
							const typeIcon = noteTypeInfo?.icon || '📝';
							const levelName = level.charAt(0).toUpperCase() + level.slice(1);
							const typeName = noteTypeInfo?.label || 'Study';

							// Create individual clickable icon for this note
							const noteIcon = actionsDiv.createEl('span', {
								text: typeIcon,
								cls: 'verse-indicator-icon',
								attr: { title: `${levelName} note (${typeName})` }
							});

							noteIcon.style.cursor = 'pointer';

							// Click to open this specific note
							noteIcon.addEventListener('click', async (e) => {
								e.stopPropagation();
								const file = this.plugin.app.vault.getAbstractFileByPath(note.notePath);
								if (file) {
									const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
									await leaf.openFile(file as any);
								}
							});

							// Hover preview for this specific note
							let hoverTimeout: NodeJS.Timeout;
							let previewEl: HTMLElement | null = null;

							noteIcon.addEventListener('mouseenter', async (e) => {
								hoverTimeout = setTimeout(async () => {
									const file = this.plugin.app.vault.getAbstractFileByPath(note.notePath);
									if (file) {
										const content = await this.plugin.app.vault.read(file as any);
										const preview = content.slice(0, 200).trim() + (content.length > 200 ? '...' : '');

										previewEl = document.createElement('div');
										previewEl.addClass('note-preview-popup');
										previewEl.textContent = preview || '(Empty note)';
										document.body.appendChild(previewEl);

										const rect = noteIcon.getBoundingClientRect();
										previewEl.style.position = 'absolute';
										previewEl.style.left = `${rect.right + 10}px`;
										previewEl.style.top = `${rect.top}px`;
										previewEl.style.zIndex = '10000';
									}
								}, 500);
							});

							noteIcon.addEventListener('mouseleave', () => {
								clearTimeout(hoverTimeout);
								if (previewEl) {
									previewEl.remove();
									previewEl = null;
								}
							});
						});
					});
				}

				// Add bookmark indicator
				const isBookmarked = this.plugin.isBookmarked(this.currentBook, this.currentChapter, verseNumInt);
				if (isBookmarked) {
					const bookmarkIcon = actionsDiv.createEl('span', {
						text: '⭐',
						cls: 'verse-indicator-icon bookmark-icon',
						attr: { title: 'Bookmarked' }
					});

					bookmarkIcon.style.cursor = 'pointer';
					bookmarkIcon.addEventListener('click', async (e) => {
						e.stopPropagation();
						const bookmark = this.plugin.getBookmarkForVerse(this.currentBook, this.currentChapter, verseNumInt);
						if (bookmark) {
							this.plugin.removeBookmark(bookmark.id);
							await this.renderAndScrollToVerse(verseNumInt);
							showToast('Bookmark removed');
						}
					});
				}

				// Add tag pills (only if tags are enabled)
				if (this.plugin.settings.showTagIndicators !== false) {
					const verseTags = this.plugin.getTagsForVerse(this.currentBook, this.currentChapter, verseNumInt);
					if (verseTags.length > 0) {
					const tagsContainer = verseDiv.createEl('span', { cls: 'verse-tags-container' });

					verseTags.forEach(tag => {
						const tagPill = tagsContainer.createEl('span', {
							text: tag.tag,
							cls: 'verse-tag-pill',
							attr: { title: `Click to view all "${tag.tag}" verses` }
						});

						tagPill.addEventListener('click', (e) => {
							e.stopPropagation();
							// Navigate to Tags Browser and show this tag
							this.viewMode = ViewMode.TAGS_BROWSER;
							void this.render();
							showToast(`Viewing "${tag.tag}" tag`);
						});

						// Right-click to remove
						tagPill.addEventListener('contextmenu', (e) => {
							e.preventDefault();
							e.stopPropagation();
							const menu = new Menu();
							menu.addItem((item) => {
								item.setTitle(`Remove "${tag.tag}" tag`)
									.setIcon('x')
									.onClick(async () => {
										this.plugin.removeVerseTag(tag.id);
										showToast(`Removed "${tag.tag}" tag`);
										await this.renderAndScrollToVerse(verseNumInt);
									});
							});
							menu.showAtMouseEvent(e);
						});
					});
					}
				}
			}
		} else {
			container.createEl('p', {
				text: 'Chapter not found. Please check your Bible data.',
				cls: 'bible-error'
			});
		}
	}

	renderPassageViewer(container: HTMLElement, version: string, parsed: any) {
		container.createEl('h3', {
			text: `${parsed.book} ${parsed.chapter}:${parsed.startVerse}-${parsed.endVerse} (${version})`,
			cls: 'passage-reference'
		});

		const chapter = this.plugin.getChapter(version, parsed.book, parsed.chapter);
		const verseNumStyle = this.plugin.settings.verseNumberStyle || 'default';
		if (chapter) {
			for (let v = parsed.startVerse; v <= parsed.endVerse; v++) {
				const verseData = chapter.verses[v.toString()];
				if (verseData) {
					const verseText = typeof verseData === 'string' ? verseData : verseData.text;
					const verseDiv = container.createDiv({ cls: 'bible-verse' });
					verseDiv.createEl('span', { text: v.toString(), cls: `bible-verse-number verse-num-${verseNumStyle}` });
					verseDiv.createEl('span', { text: verseText, cls: 'bible-verse-text' });
				}
			}
		}
	}

	renderStrongsVerse(container: HTMLElement, verseData: StrongsVerse) {
		// Render BSB verse with Strong's word tagging
		const words = verseData.text.split(' ');

		// Track which Strong's words we've already used
		const usedStrongs: Set<number> = new Set();

		words.forEach((word, index) => {
			// Clean word for matching (remove punctuation)
			const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();

			// Find Strong's mapping by matching the word text
			const strongsWord = verseData.strongs.find((s, idx) => {
				if (usedStrongs.has(idx)) return false;
				const cleanStrongsWord = s.word.replace(/[^\w]/g, '').toLowerCase();
				return cleanStrongsWord === cleanWord;
			});

			if (strongsWord && strongsWord.number) {
				// Mark this Strong's word as used
				const strongsIndex = verseData.strongs.indexOf(strongsWord);
				usedStrongs.add(strongsIndex);

				// This word has a Strong's number - make it interactive
				const wordSpan = container.createEl('span', {
					text: word,
					cls: 'strongs-word'
				});
				wordSpan.dataset.strongs = strongsWord.number;

				// Click to select word for Word Study tab
				wordSpan.addEventListener('click', async (e) => {
					e.stopPropagation();
					this.selectedStrongsWord = strongsWord.number;
					// Open sidebar if closed and switch to Word Study tab
					if (!this.plugin.settings.showContextSidebar) {
						this.plugin.settings.showContextSidebar = true;
					}
					this.plugin.settings.contextSidebarTab = 'word-study';
					await this.plugin.saveSettings();
					this.render(); // Re-render to show sidebar with selected word
				});

				// Add space after word (outside the span)
				container.appendText(' ');
			} else {
				// Regular word without Strong's tagging
				container.appendText(word + ' ');
			}
		});
	}

	async renderInterlinearVerse(container: HTMLElement, verseText: string, book: string, chapter: number, verse: number) {
		// Render ESV/NIV verse with Strong's tooltips using interlinear data

		// Try to load interlinear data for this verse
		const interlinearWords = await this.plugin.getInterlinearVerse(book, chapter, verse);

		if (!interlinearWords || interlinearWords.length === 0) {
			// No interlinear data available - just show plain text
			container.setText(verseText);
			return;
		}

		// Build a mapping of English text positions to Strong's numbers
		// This handles multi-word translations and word order differences
		const textLower = verseText.toLowerCase();
		const wordMappings: Array<{ start: number; end: number; strongsNumber: string; text: string }> = [];

		// For each interlinear word, find where its English translation appears in the verse
		for (const interlinearWord of interlinearWords) {
			if (!interlinearWord.text || !interlinearWord.number) continue;

			const searchText = interlinearWord.text.toLowerCase();
			let searchPos = 0;

			// Find this text in the verse (may appear multiple times)
			while (true) {
				const foundPos = textLower.indexOf(searchText, searchPos);
				if (foundPos === -1) break;

				// Check if this position is already mapped
				const alreadyMapped = wordMappings.some(m =>
					(foundPos >= m.start && foundPos < m.end) ||
					(foundPos + searchText.length > m.start && foundPos + searchText.length <= m.end)
				);

				if (!alreadyMapped) {
					// Add this mapping
					wordMappings.push({
						start: foundPos,
						end: foundPos + searchText.length,
						strongsNumber: interlinearWord.number.toUpperCase(),
						text: interlinearWord.text
					});
					break; // Found a match, move to next interlinear word
				}

				// Try next occurrence
				searchPos = foundPos + 1;
			}
		}

		// Sort mappings by position
		wordMappings.sort((a, b) => a.start - b.start);

		// Render the verse with Strong's spans
		let currentPos = 0;

		for (const mapping of wordMappings) {
			// Add any text before this mapping as plain text
			if (currentPos < mapping.start) {
				const plainText = verseText.substring(currentPos, mapping.start);
				container.appendText(plainText);
			}

			// Add the mapped word with Strong's number
			const mappedText = verseText.substring(mapping.start, mapping.end);
			const strongsNum = mapping.strongsNumber;

			const wordSpan = container.createEl('span', {
				text: mappedText,
				cls: 'strongs-word'
			});
			wordSpan.dataset.strongs = strongsNum;

			// Click to select word for Word Study tab
			wordSpan.addEventListener('click', async (e) => {
				e.stopPropagation();
				this.selectedStrongsWord = strongsNum;
				// Open sidebar if closed and switch to Word Study tab
				if (!this.plugin.settings.showContextSidebar) {
					this.plugin.settings.showContextSidebar = true;
				}
				this.plugin.settings.contextSidebarTab = 'word-study';
				await this.plugin.saveSettings();
				this.render(); // Re-render to show sidebar with selected word
			});

			currentPos = mapping.end;
		}

		// Add any remaining text
		if (currentPos < verseText.length) {
			container.appendText(verseText.substring(currentPos));
		}
	}

	showStrongsTooltip(event: MouseEvent, strongsNumber: string) {
		const entry = this.plugin.getStrongsDefinition(strongsNumber);
		if (!entry) return;

		// Create tooltip
		const tooltip = document.createElement('div');
		tooltip.addClass('strongs-tooltip');

		// Strong's number
		tooltip.createEl('div', {
			text: strongsNumber,
			cls: 'strongs-tooltip-number'
		});

		// Original word (Hebrew/Greek)
		tooltip.createEl('div', {
			text: entry.lemma,
			cls: 'strongs-tooltip-original'
		});

		// Transliteration
		const transliteration = 'translit' in entry ? entry.translit : entry.xlit;
		tooltip.createEl('div', {
			text: transliteration,
			cls: 'strongs-tooltip-transliteration'
		});

		// Definition preview (first 100 chars)
		const defPreview = entry.strongs_def.length > 100
			? entry.strongs_def.substring(0, 100) + '...'
			: entry.strongs_def;
		tooltip.createEl('div', {
			text: defPreview,
			cls: 'strongs-tooltip-definition'
		});

		// Hint
		tooltip.createEl('div', {
			text: 'Click for full entry',
			cls: 'strongs-tooltip-hint'
		});

		// Position tooltip near cursor
		const target = event.target as HTMLElement;
		const rect = target.getBoundingClientRect();

		// Position below the word, centered
		const tooltipLeft = rect.left + (rect.width / 2);
		const tooltipTop = rect.bottom + 10;

		tooltip.style.left = `${tooltipLeft}px`;
		tooltip.style.top = `${tooltipTop}px`;
		tooltip.style.transform = 'translateX(-50%)'; // Center horizontally

		document.body.appendChild(tooltip);
		tooltip.dataset.strongsTooltip = 'active';
	}

	hideStrongsTooltip() {
		const tooltip = document.body.querySelector('[data-strongs-tooltip="active"]');
		if (tooltip) {
			tooltip.remove();
		}
	}


	showStrongsModal(strongsNumber: string) {
		const entry = this.plugin.getStrongsDefinition(strongsNumber);
		if (!entry) return;

		// Create modal overlay
		const overlay = document.createElement('div');
		overlay.addClass('strongs-modal-overlay');

		const modal = overlay.createDiv('strongs-modal');

		// Make all modal content selectable
		modal.style.userSelect = 'text';

		// Header
		const header = modal.createDiv('strongs-modal-header');
		header.createEl('h2', {
			text: `${strongsNumber} - ${entry.lemma}`,
			cls: 'strongs-modal-title'
		});

		// Copy button
		const copyBtn = header.createEl('button', {
			text: '📋',
			cls: 'strongs-modal-copy',
			attr: { title: 'Copy to clipboard' }
		});

		const closeBtn = header.createEl('button', {
			text: '✕',
			cls: 'strongs-modal-close'
		});

		// Content
		const content = modal.createDiv('strongs-modal-content');

		// Original word (large display)
		content.createEl('div', {
			text: entry.lemma,
			cls: 'strongs-modal-original'
		});

		// Transliteration (+ Pronunciation for Hebrew)
		const translitPronText = 'translit' in entry
			? entry.translit
			: `${entry.xlit} (${entry.pron})`;
		content.createEl('div', {
			text: translitPronText,
			cls: 'strongs-modal-pronunciation'
		});

		// Strong's definition
		content.createEl('div', {
			text: entry.strongs_def,
			cls: 'strongs-modal-definition'
		});

		// KJV definition
		content.createEl('div', {
			text: `KJV: ${entry.kjv_def}`,
			cls: 'strongs-modal-kjv'
		});

		// Derivation/Etymology with clickable Strong's references
		if (entry.derivation) {
			const derivationDiv = content.createDiv('strongs-modal-derivation');
			derivationDiv.createEl('strong', { text: 'Etymology: ' });

			// Parse and render derivation with clickable Strong's numbers
			this.renderDerivationWithLinks(derivationDiv, entry.derivation);
		}

		// Copy button handler
		copyBtn.addEventListener('click', () => {
			const copyText = [
				`${strongsNumber} - ${entry.lemma}`,
				translitPronText,
				'',
				entry.strongs_def,
				'',
				`KJV: ${entry.kjv_def}`,
				'',
				entry.derivation ? `Etymology: ${entry.derivation}` : ''
			].filter(line => line).join('\n');

			navigator.clipboard.writeText(copyText).then(() => {
				copyBtn.setText('✓');
				setTimeout(() => copyBtn.setText('📋'), 1000);
			}).catch(() => showToast('Failed to copy to clipboard'));
		});

		// Close handlers
		closeBtn.addEventListener('click', () => overlay.remove());
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		document.body.appendChild(overlay);
	}

	renderDerivationWithLinks(container: HTMLElement, derivation: string) {
		// Match Strong's numbers in format: H1234, G5678, etc.
		const strongsPattern = /([HG]\d+)/g;
		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = strongsPattern.exec(derivation)) !== null) {
			// Add text before the match
			if (match.index > lastIndex) {
				container.appendText(derivation.substring(lastIndex, match.index));
			}

			// Add clickable Strong's number
			const strongsNum = match[1];
			const link = container.createEl('a', {
				text: strongsNum,
				cls: 'strongs-link'
			});
			link.style.cursor = 'pointer';
			link.style.color = 'var(--interactive-accent)';
			link.style.textDecoration = 'underline';

			link.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				// Close modal and show in Word Study tab
				const overlay = container.closest('.strongs-modal-overlay') as HTMLElement;
				if (overlay) overlay.remove();
				this.selectedStrongsWord = strongsNum;
				if (!this.plugin.settings.showContextSidebar) {
					this.plugin.settings.showContextSidebar = true;
				}
				this.plugin.settings.contextSidebarTab = 'word-study';
				await this.plugin.saveSettings();
				await this.render();
			});

			lastIndex = strongsPattern.lastIndex;
		}

		// Add remaining text
		if (lastIndex < derivation.length) {
			container.appendText(derivation.substring(lastIndex));
		}
	}

	parseVerseReference(ref: string): { book: string, chapter: number, verse: number } | null {
		// Parse "John 3:16" format
		const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
		if (match) {
			return {
				book: match[1].trim(),
				chapter: parseInt(match[2]),
				verse: parseInt(match[3])
			};
		}
		return null;
	}

	parsePassageReference(ref: string): { book: string, chapter: number, startVerse: number, endVerse: number } | null {
		// Parse "John 3:16-21" format
		const match = ref.match(/^(.+?)\s+(\d+):(\d+)-(\d+)$/);
		if (match) {
			return {
				book: match[1].trim(),
				chapter: parseInt(match[2]),
				startVerse: parseInt(match[3]),
				endVerse: parseInt(match[4])
			};
		}
		return null;
	}

	/**
	 * Parse simple "Book Chapter" format like "Genesis 1" or "Psalm 23"
	 * Also handles "Genesis 1-3" chapter ranges (returns first chapter)
	 */
	parseSimpleReference(ref: string): { book: string, chapter: number } | null {
		// Try "Book Chapter" or "Book Chapter-Chapter" format
		const match = ref.match(/^(.+?)\s+(\d+)(?:-\d+)?$/);
		if (match) {
			return {
				book: match[1].trim(),
				chapter: parseInt(match[2])
			};
		}
		return null;
	}

	performVerseLookup() {
		void this.render();
	}

	performPassageLookup() {
		void this.render();
	}

	/**
	 * Show a popup with session details (books and chapters visited)
	 */
	showSessionDetailsPopup(stats: { duration: number; chapters: number; verses: number; notes: number; highlights: number; chaptersVisited: string[]; booksVisited: string[] }) {
		// Remove any existing popup
		const existing = document.querySelector('.session-details-popup');
		if (existing) existing.remove();

		// Create overlay
		const overlay = document.createElement('div');
		overlay.addClass('session-details-overlay');
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) overlay.remove();
		});

		// Create popup
		const popup = document.createElement('div');
		popup.addClass('session-details-popup');

		// Header
		const header = popup.createDiv({ cls: 'session-details-header' });
		header.createEl('h3', { text: '📊 Session Details' });
		const closeBtn = header.createEl('button', { cls: 'session-details-close', text: '×' });
		closeBtn.addEventListener('click', () => overlay.remove());

		// Stats summary
		const summaryDiv = popup.createDiv({ cls: 'session-details-summary' });
		const statItems = [
			{ icon: '⏱️', label: 'Duration', value: `${stats.duration} minutes` },
			{ icon: '📖', label: 'Chapters', value: `${stats.chapters}` },
			{ icon: '📚', label: 'Books', value: `${stats.booksVisited.length}` },
			{ icon: '📝', label: 'Notes', value: `${stats.notes}` },
			{ icon: '🎨', label: 'Highlights', value: `${stats.highlights}` }
		];
		statItems.forEach(item => {
			const stat = summaryDiv.createDiv({ cls: 'session-detail-stat' });
			stat.createSpan({ text: item.icon, cls: 'session-detail-icon' });
			stat.createSpan({ text: item.label, cls: 'session-detail-label' });
			stat.createSpan({ text: item.value, cls: 'session-detail-value' });
		});

		// Books visited section
		if (stats.booksVisited.length > 0) {
			const booksSection = popup.createDiv({ cls: 'session-details-section' });
			booksSection.createEl('h4', { text: `📚 Books Visited (${stats.booksVisited.length})` });
			const booksList = booksSection.createDiv({ cls: 'session-books-list' });

			// Group chapters by book
			const chaptersByBook = new Map<string, number[]>();
			stats.chaptersVisited.forEach(ch => {
				const parts = ch.split(' ');
				const chapter = parseInt(parts[parts.length - 1]);
				const book = parts.slice(0, -1).join(' ');
				if (!chaptersByBook.has(book)) {
					chaptersByBook.set(book, []);
				}
				chaptersByBook.get(book)!.push(chapter);
			});

			// Sort books by canonical order
			const sortedBooks = stats.booksVisited.sort((a, b) => {
				const orderA = this.plugin.getBookOrder(a);
				const orderB = this.plugin.getBookOrder(b);
				return orderA - orderB;
			});

			sortedBooks.forEach(book => {
				const bookItem = booksList.createDiv({ cls: 'session-book-item' });
				const chapters = chaptersByBook.get(book) || [];
				chapters.sort((a, b) => a - b);

				const bookName = bookItem.createSpan({ cls: 'session-book-name', text: book });
				bookName.addEventListener('click', () => {
					this.currentBook = book;
					this.currentChapter = chapters[0] || 1;
					this.viewMode = ViewMode.CHAPTER;
					void this.render();
					overlay.remove();
				});

				const chapterList = bookItem.createSpan({
					cls: 'session-chapter-list',
					text: chapters.length > 5
						? `Ch. ${chapters.slice(0, 5).join(', ')}... (${chapters.length} total)`
						: `Ch. ${chapters.join(', ')}`
				});
			});
		} else {
			const emptyDiv = popup.createDiv({ cls: 'session-details-empty' });
			emptyDiv.createEl('p', { text: 'No chapters visited yet this session.' });
			emptyDiv.createEl('p', { text: 'Navigate to a chapter to start tracking!' });
		}

		overlay.appendChild(popup);
		document.body.appendChild(overlay);

		// ESC to close
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				overlay.remove();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	}

	showVerseContextMenu(event: MouseEvent, book: string, chapter: number, verse: number, version?: string) {
		console.debug('showVerseContextMenu called for:', book, chapter, verse, 'version:', version);

		// Create custom popup menu
		const menu = document.createElement('div');
		menu.addClass('bible-verse-menu');

		// Position near click
		menu.style.position = 'absolute';
		menu.style.left = `${event.clientX}px`;
		menu.style.top = `${event.clientY}px`;
		menu.style.zIndex = '1000';

		// Add menu header
		const header = menu.createEl('div', {
			text: `${book} ${chapter}:${verse}`,
			cls: 'bible-menu-header'
		});

		// Check if verse already has highlight
		const highlights = this.plugin.getHighlightsForVerse(book, chapter, verse);
		const hasHighlight = highlights.length > 0;
		const hasSelection = this.selectedVerseStart !== null && this.selectedVerseEnd !== null;

		// Add highlight options (or change color if highlighted)
		this.plugin.settings.highlightColors.forEach((colorDef, index) => {
			let itemText = '';
			if (hasSelection) {
				itemText = `🎨 Highlight verses ${this.selectedVerseStart}-${this.selectedVerseEnd} (${colorDef.name})`;
			} else if (hasHighlight) {
				itemText = `🎨 Change to ${colorDef.name}`;
			} else {
				itemText = `🎨 Highlight (${colorDef.name})`;
			}

			const item = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: itemText
			});
			item.style.borderLeft = `4px solid ${colorDef.color}`;
			item.addEventListener('click', async () => {
				// Remember which verse we're working with
				const targetVerse = hasSelection ? this.selectedVerseStart : verse;

				menu.remove();

				if (hasSelection) {
					// Highlight range
					await this.highlightSelectedRange(colorDef.color);
				} else {
					// Highlight single verse
					// If already highlighted, remove old highlight first
					if (hasHighlight) {
						await Promise.all(highlights.map(h => this.plugin.removeHighlight(h.id)));
					}
					await this.addVerseHighlight(book, chapter, verse, colorDef.color);
				}

				// Scroll to the verse after render
				setTimeout(() => {
					const verseEl = this.containerEl.querySelector(`.bible-verse[data-verse="${targetVerse}"]`) as HTMLElement;
					if (verseEl) {
						verseEl.scrollIntoView({ behavior: 'auto', block: 'center' });
					}
				}, 50);
			});
		});

		// Remove highlight option
		if (hasHighlight) {
			const item = menu.createEl('div', {
				cls: 'bible-menu-item'
			});
			const itemIcon = item.createSpan({ cls: 'menu-icon' });
			setIcon(itemIcon, 'trash-2');
			item.createSpan({ text: 'Remove highlight' });
			item.addEventListener('click', async () => {
				await Promise.all(highlights.map(h => this.plugin.removeHighlight(h.id)));
				menu.remove();
				await this.renderAndScrollToVerse(verse);
				showToast('Highlight removed');
			});
		}

		// Move to layer option (only if highlighted)
		if (hasHighlight) {
			const currentHighlight = highlights[0];
			const currentLayerId = currentHighlight.layer || 'personal';

			// Submenu header
			const moveToLayerHeader = menu.createEl('div', {
				cls: 'bible-menu-subheader',
				text: '📁 Move to Layer'
			});

			// Show each layer as an option
			this.plugin.settings.annotationLayers.forEach(layer => {
				const layerItem = menu.createEl('div', {
					cls: `bible-menu-item ${currentLayerId === layer.id ? 'layer-current' : ''}`
				});
				layerItem.style.borderLeft = `4px solid ${layer.color}`;

				const layerName = layerItem.createSpan({ text: layer.name });
				if (currentLayerId === layer.id) {
					layerName.createSpan({ text: ' ✓', cls: 'layer-checkmark' });
				}

				layerItem.addEventListener('click', async () => {
					// Move all highlights for this verse to the selected layer
					for (const highlight of highlights) {
						highlight.layer = layer.id;
					}
					await this.plugin.saveHighlightsAndNotes();
					menu.remove();
					await this.renderAndScrollToVerse(verse);
					showToast(`Moved to ${layer.name} layer`);
				});
			});
		}

		// Separator
		menu.createEl('div', { cls: 'bible-menu-separator' });

		// Note options header
		menu.createEl('div', {
			cls: 'bible-menu-subheader',
			text: 'Notes'
		});

		// Add verse note options - one for each type
		NOTE_TYPES.forEach(noteType => {
			const verseNoteItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: `${noteType.icon} Create ${noteType.label} note`
			});
			verseNoteItem.addEventListener('click', async () => {
				await this.createNoteForVerseWithType(book, chapter, verse, noteType.type);
				menu.remove();
			});
		});

		// Add passage note option (only if range selected)
		if (hasSelection) {
			const passageNoteItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: `📝 Create passage note (${this.selectedVerseStart}-${this.selectedVerseEnd})`
			});
			passageNoteItem.addEventListener('click', async () => {
				await this.createPassageNote(book, chapter, this.selectedVerseStart!, this.selectedVerseEnd!);
				menu.remove();
			});
		}

		// Add chapter note option
		const chapterNoteItem = menu.createEl('div', {
			cls: 'bible-menu-item',
			text: `📝 Create chapter note (${book} ${chapter})`
		});
		chapterNoteItem.addEventListener('click', async () => {
			await this.createChapterNote(book, chapter);
			menu.remove();
		});

		// Add book note option
		const bookNoteItem = menu.createEl('div', {
			cls: 'bible-menu-item',
			text: `📝 Create book note (${book})`
		});
		bookNoteItem.addEventListener('click', async () => {
			await this.createBookNote(book);
			menu.remove();
		});

		// Open note option (if note exists)
		const noteRefs = this.plugin.getNoteReferencesForVerse(book, chapter, verse);
		if (noteRefs.length > 0) {
			const openNoteItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: `📂 Open note (${noteRefs[0].noteLevel})`
			});
			openNoteItem.addEventListener('click', async () => {
				const notePath = noteRefs[0].notePath;
				const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
				if (file) {
					// Open in split pane to the right
					const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
					await leaf.openFile(file as any);
				}
				menu.remove();
			});

			// Delete note options - show one for each note
			if (noteRefs.length === 1) {
				// Single note - simple delete option
				const noteTypeInfo = NOTE_TYPES.find(t => t.type === (noteRefs[0].noteType || 'personal'));
				const deleteNoteItem = menu.createEl('div', {
					cls: 'bible-menu-item bible-menu-item-danger'
				});
				const deleteIcon = deleteNoteItem.createSpan({ cls: 'menu-icon' });
				setIcon(deleteIcon, 'trash-2');
				deleteNoteItem.createSpan({ text: `Delete ${noteTypeInfo?.label || 'Study'} note` });
				deleteNoteItem.addEventListener('click', async () => {
					const file = this.plugin.app.vault.getAbstractFileByPath(noteRefs[0].notePath);
					if (file) {
						await this.plugin.app.vault.delete(file);
					}
					this.plugin.removeNoteReference(book, chapter, verse, noteRefs[0].noteType);
					menu.remove();
					await this.renderAndScrollToVerse(verse);
					showToast('Note deleted');
				});
			} else {
				// Multiple notes - show delete option for each
				noteRefs.forEach(note => {
					const noteTypeInfo = NOTE_TYPES.find(t => t.type === (note.noteType || 'personal'));
					const deleteNoteItem = menu.createEl('div', {
						cls: 'bible-menu-item bible-menu-item-danger'
					});
					const deleteIcon = deleteNoteItem.createSpan({ cls: 'menu-icon' });
					setIcon(deleteIcon, 'trash-2');
					deleteNoteItem.createSpan({ text: `Delete ${noteTypeInfo?.label || 'Study'} note` });
					deleteNoteItem.addEventListener('click', async () => {
						const file = this.plugin.app.vault.getAbstractFileByPath(note.notePath);
						if (file) {
							await this.plugin.app.vault.delete(file);
						}
						this.plugin.removeNoteReference(book, chapter, verse, note.noteType);
						menu.remove();
						await this.renderAndScrollToVerse(verse);
						showToast(`${noteTypeInfo?.label} note deleted`);
					});
				});
			}
		}

		// Separator
		menu.createEl('div', { cls: 'bible-menu-separator' });

		// Bookmark option
		const isBookmarked = this.plugin.isBookmarked(book, chapter, verse);

		if (hasSelection) {
			// Bookmark range option
			const bookmarkRangeItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: `⭐ Bookmark verses ${this.selectedVerseStart}-${this.selectedVerseEnd}`
			});
			bookmarkRangeItem.addEventListener('click', async () => {
				const targetVerse = this.selectedVerseStart!;
				menu.remove();
				await this.bookmarkSelectedRange();
				// Scroll to verse after render
				setTimeout(() => {
					const verseEl = this.containerEl.querySelector(`.bible-verse[data-verse="${targetVerse}"]`) as HTMLElement;
					if (verseEl) verseEl.scrollIntoView({ behavior: 'auto', block: 'center' });
				}, 50);
			});
		} else if (isBookmarked) {
			const removeBookmarkItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: '⭐ Remove bookmark'
			});
			removeBookmarkItem.addEventListener('click', async () => {
				const bookmark = this.plugin.getBookmarkForVerse(book, chapter, verse);
				if (bookmark) {
					this.plugin.removeBookmark(bookmark.id);
					menu.remove();
					await this.renderAndScrollToVerse(verse);
					showToast('Bookmark removed');
				}
			});
		} else {
			const addBookmarkItem = menu.createEl('div', {
				cls: 'bible-menu-item',
				text: '⭐ Bookmark verse'
			});
			addBookmarkItem.addEventListener('click', async () => {
				menu.remove();
				const verseText = this.plugin.getVerseText(this.currentVersion, book, chapter, verse);
				if (verseText) {
					const defaultName = `${book} ${chapter}:${verse}`;
					const name = await this.plugin.promptBookmarkName(defaultName);
					if (name === null) return; // Cancelled

					const bookmark: Bookmark = {
						id: `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
						name,
						book,
						bookmarkLevel: 'verse',
						chapter,
						verse,
						text: verseText,
						createdAt: Date.now()
					};
					this.plugin.addBookmark(bookmark);

					// Render and scroll to verse
					await this.renderAndScrollToVerse(verse);

					// Trigger bookmark pop animation
					const bookmarkIcon = this.containerEl.querySelector(`.bible-verse[data-verse="${verse}"] .bookmark-icon`);
					if (bookmarkIcon) {
						bookmarkIcon.addClass('just-added');
						setTimeout(() => bookmarkIcon.removeClass('just-added'), 400);
					}

					showToast(`Bookmarked: ${name}`);
				}
			});
		}

		// Bookmark chapter option
		const chapterBookmarked = this.plugin.bookmarks.some(b =>
			b.book === book && b.chapter === chapter && b.bookmarkLevel === 'chapter'
		);
		const bookmarkChapterItem = menu.createEl('div', {
			cls: 'bible-menu-item'
		});
		const chapterBookmarkIcon = bookmarkChapterItem.createSpan({ cls: 'menu-icon' });
		setIcon(chapterBookmarkIcon, chapterBookmarked ? 'bookmark-minus' : 'bookmark-plus');
		bookmarkChapterItem.createSpan({ text: chapterBookmarked ? 'Remove chapter bookmark' : 'Bookmark chapter' });
		bookmarkChapterItem.addEventListener('click', async () => {
			menu.remove();
			if (chapterBookmarked) {
				const bookmark = this.plugin.bookmarks.find(b =>
					b.book === book && b.chapter === chapter && b.bookmarkLevel === 'chapter'
				);
				if (bookmark) {
					this.plugin.removeBookmark(bookmark.id);
					showToast('Chapter bookmark removed');
				}
			} else {
				const defaultName = `${book} ${chapter}`;
				const name = await this.plugin.promptBookmarkName(defaultName);
				if (name === null) return; // Cancelled

				const bookmark: Bookmark = {
					id: `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					name,
					book,
					bookmarkLevel: 'chapter',
					chapter,
					createdAt: Date.now()
				};
				this.plugin.addBookmark(bookmark);
				showToast(`Bookmarked: ${name}`);
			}
			await this.renderAndScrollToVerse(verse);
		});

		// Bookmark book option
		const bookBookmarked = this.plugin.bookmarks.some(b =>
			b.book === book && b.bookmarkLevel === 'book'
		);
		const bookmarkBookItem = menu.createEl('div', {
			cls: 'bible-menu-item'
		});
		const bookBookmarkIcon = bookmarkBookItem.createSpan({ cls: 'menu-icon' });
		setIcon(bookBookmarkIcon, bookBookmarked ? 'book-minus' : 'book-plus');
		bookmarkBookItem.createSpan({ text: bookBookmarked ? 'Remove book bookmark' : 'Bookmark book' });
		bookmarkBookItem.addEventListener('click', async () => {
			if (bookBookmarked) {
				const bookmark = this.plugin.bookmarks.find(b =>
					b.book === book && b.bookmarkLevel === 'book'
				);
				if (bookmark) {
					this.plugin.removeBookmark(bookmark.id);
					showToast('Book bookmark removed');
				}
			} else {
				// Prompt for bookmark name
				const defaultName = book;
				const bookmarkName = await this.plugin.promptBookmarkName(defaultName);
				if (bookmarkName === null) {
					menu.remove();
					return; // User cancelled
				}
				const bookmark: Bookmark = {
					id: `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					name: bookmarkName || undefined,
					book,
					bookmarkLevel: 'book',
					createdAt: Date.now()
				};
				this.plugin.addBookmark(bookmark);
				showToast(`${book} bookmarked`);
			}
			menu.remove();
			await this.renderAndScrollToVerse(verse);
		});

		// Tags section
		menu.createEl('div', { cls: 'bible-menu-separator' });
		menu.createEl('div', {
			cls: 'bible-menu-subheader',
			text: 'Tags'
		});

		// Get existing tags for this verse
		const existingTags = this.plugin.getTagsForVerse(book, chapter, verse);
		const allTagNames = this.plugin.getAllTagNames();

		// Show existing tags on this verse (with remove option)
		if (existingTags.length > 0) {
			existingTags.forEach(tag => {
				const tagItem = menu.createEl('div', {
					cls: 'bible-menu-item bible-menu-tag-item'
				});
				const tagIcon = tagItem.createSpan({ cls: 'menu-icon' });
				setIcon(tagIcon, 'tag');
				tagItem.createSpan({ text: `${tag.tag} ✕` });
				tagItem.addEventListener('click', async () => {
					this.plugin.removeVerseTag(tag.id);
					showToast(`Removed "${tag.tag}" tag`);
					menu.remove();
					await this.renderAndScrollToVerse(verse);
				});
			});
			menu.createEl('div', { cls: 'bible-menu-separator-light' });
		}

		// Add existing tag (submenu style - show available tags)
		const existingTagNames = existingTags.map(t => t.tag);
		const availableTags = allTagNames.filter(t => !existingTagNames.includes(t));

		if (availableTags.length > 0) {
			const addExistingHeader = menu.createEl('div', {
				cls: 'bible-menu-item bible-menu-item-expand'
			});
			const addExistingIcon = addExistingHeader.createSpan({ cls: 'menu-icon' });
			setIcon(addExistingIcon, 'tag');
			addExistingHeader.createSpan({ text: 'Add existing tag...' });

			// Create submenu for existing tags
			const tagSubmenu = menu.createEl('div', { cls: 'bible-menu-submenu' });
			tagSubmenu.style.display = 'none';

			availableTags.forEach(tagName => {
				const tagOption = tagSubmenu.createEl('div', {
					cls: 'bible-menu-item',
					text: tagName
				});
				tagOption.addEventListener('click', async () => {
					const newTag: VerseTag = {
						id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
						book,
						chapter,
						verse,
						tag: tagName,
						createdAt: Date.now()
					};
					this.plugin.addVerseTag(newTag);
					showToast(`Added "${tagName}" tag`);
					menu.remove();
					await this.renderAndScrollToVerse(verse);
				});
			});

			addExistingHeader.addEventListener('click', (e) => {
				e.stopPropagation();
				tagSubmenu.style.display = tagSubmenu.style.display === 'none' ? 'block' : 'none';
			});
		}

		// Add new tag option
		const addNewTagItem = menu.createEl('div', {
			cls: 'bible-menu-item'
		});
		const addNewIcon = addNewTagItem.createSpan({ cls: 'menu-icon' });
		setIcon(addNewIcon, 'tag-plus' as any);
		addNewTagItem.createSpan({ text: 'Add new tag...' });
		addNewTagItem.addEventListener('click', () => {
			menu.remove();
			this.showAddTagToVerseDialog(book, chapter, verse);
		});

		// Memorization option (if enabled)
		if (this.plugin.settings.enableMemorization) {
			menu.createEl('div', { cls: 'bible-menu-separator' });

			const verseRef = `${book} ${chapter}:${verse}`;
			const isMemorizing = this.plugin.settings.memorizationVerses.some(v => v.reference === verseRef);

			if (isMemorizing) {
				const removeMemItem = menu.createEl('div', {
					cls: 'bible-menu-item'
				});
				const removeMemIcon = removeMemItem.createSpan({ cls: 'menu-icon' });
				setIcon(removeMemIcon, 'brain');
				removeMemItem.createSpan({ text: 'Remove from memorization' });
				removeMemItem.addEventListener('click', async () => {
					this.plugin.settings.memorizationVerses = this.plugin.settings.memorizationVerses.filter(
						v => v.reference !== verseRef
					);
					await this.plugin.saveSettings();
					menu.remove();
					showToast('Removed from memorization list');
				});
			} else {
				const addMemItem = menu.createEl('div', {
					cls: 'bible-menu-item'
				});
				const addMemIcon = addMemItem.createSpan({ cls: 'menu-icon' });
				setIcon(addMemIcon, 'brain');
				addMemItem.createSpan({ text: 'Add to memorization' });
				addMemItem.addEventListener('click', async () => {
					const verseText = this.plugin.getVerseText(this.currentVersion, book, chapter, verse) || '';
					const now = new Date().toISOString();
					const newVerse: MemorizationVerse = {
						reference: verseRef,
						text: verseText,
						version: this.currentVersion,
						status: 'new',
						easeFactor: 2.5,
						interval: 1,
						repetitions: 0,
						nextReview: now,
						lastReview: now,
						createdDate: now
					};
					this.plugin.settings.memorizationVerses.push(newVerse);
					await this.plugin.saveSettings();
					menu.remove();
					showToast('Added to memorization list');
				});
			}
		}

		// Copy to clipboard option
		menu.createEl('div', { cls: 'bible-menu-separator' });

		const copyItem = menu.createEl('div', {
			cls: 'bible-menu-item',
			text: hasSelection
				? `📋 Copy verses ${this.selectedVerseStart}-${this.selectedVerseEnd}`
				: `📋 Copy verse ${verse}`
		});
		copyItem.addEventListener('click', () => {
			this.copyToClipboard(book, chapter, verse, hasSelection, version);
			menu.remove();
		});

		// Export as image option
		const exportItem = menu.createEl('div', {
			cls: 'bible-menu-item',
			text: hasSelection
				? `🖼️ Export verses ${this.selectedVerseStart}-${this.selectedVerseEnd} as image`
				: `🖼️ Export verse ${verse} as image`
		});
		exportItem.addEventListener('click', () => {
			this.exportAsImage(book, chapter, verse, hasSelection);
			menu.remove();
		});

		// Add to document
		document.body.appendChild(menu);

		// Smart positioning: adjust position after adding to DOM (so we know menu dimensions)
		const menuRect = menu.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		let finalX = event.clientX;
		let finalY = event.clientY;

		// Check if menu extends beyond right edge
		if (finalX + menuRect.width > viewportWidth) {
			finalX = viewportWidth - menuRect.width - 10; // 10px padding from edge
		}

		// Check if menu extends beyond bottom edge
		if (finalY + menuRect.height > viewportHeight) {
			// Flip menu upward instead of downward
			finalY = event.clientY - menuRect.height;
			// If still off-screen (too close to top), clamp to viewport
			if (finalY < 0) {
				finalY = 10; // 10px padding from top
			}
		}

		// Apply final position
		menu.style.left = `${finalX}px`;
		menu.style.top = `${finalY}px`;

		// Close menu when clicking outside
		const closeMenu = (e: MouseEvent) => {
			if (!menu.contains(e.target as Node)) {
				menu.remove();
				document.removeEventListener('click', closeMenu);
			}
		};
		setTimeout(() => document.addEventListener('click', closeMenu), 10);
	}

	showCrossReferencePopup(event: MouseEvent, book: string, chapter: number, verse: number, crossRefs: string[]) {
		// Use Obsidian's Modal for proper cleanup
		const modal = new Modal(this.app);

		modal.titleEl.setText(`Cross-References for ${book} ${chapter}:${verse}`);

		const { contentEl } = modal;
		contentEl.empty();
		contentEl.addClass('cross-ref-modal-content');

		crossRefs.forEach(ref => {
			const refItem = contentEl.createEl('div', { cls: 'cross-ref-item' });

			const refLink = refItem.createEl('a', {
				text: ref,
				cls: 'cross-ref-link'
			});
			refLink.style.cursor = 'pointer';

			// Add click handler to navigate to reference
			refLink.addEventListener('click', (e) => {
				e.preventDefault();
				modal.close();
				this.navigateToReference(ref);
				showToast(`Navigated to ${ref}`);
			});

			// Add hover preview
			let hoverTimeout: NodeJS.Timeout;
			let previewEl: HTMLElement | null = null;

			refLink.addEventListener('mouseenter', async () => {
				hoverTimeout = setTimeout(async () => {
					const verseText = this.getVerseFromReference(ref);
					if (verseText && !previewEl) {
						previewEl = refItem.createEl('div', { cls: 'cross-ref-preview-inline' });
						previewEl.createEl('em', { text: verseText });
					}
				}, 300);
			});

			refLink.addEventListener('mouseleave', () => {
				clearTimeout(hoverTimeout);
				if (previewEl) {
					previewEl.remove();
					previewEl = null;
				}
			});
		});

		// Add copy button at bottom
		const buttonContainer = contentEl.createEl('div', { cls: 'cross-ref-button-container' });
		buttonContainer.style.marginTop = '15px';
		buttonContainer.style.textAlign = 'center';

		const copyButton = buttonContainer.createEl('button', {
			text: '📋 Copy All References',
			cls: 'mod-cta'
		});
		copyButton.addEventListener('click', () => {
			const refText = crossRefs.join('\n');
			navigator.clipboard.writeText(refText).then(() => {
				showToast(`Copied ${crossRefs.length} cross-references to clipboard`);
			}).catch(err => {
				console.error('Failed to copy:', err);
				showToast('Failed to copy to clipboard');
			});
		});

		modal.open();
	}

	navigateToReference(reference: string) {
		// Parse reference - supports multiple formats:
		// "Book Chapter:Verse" (e.g., "John 3:16")
		// "Book Chapter:Verse-Verse" (e.g., "John 3:16-21")
		// "Book Chapter" (e.g., "John 3")

		// Try full verse/passage reference first
		const verseMatch = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
		if (verseMatch) {
			const [, book, chapter, startVerse, endVerse] = verseMatch;
			this.currentBook = book.trim();
			this.currentChapter = parseInt(chapter);

			// Switch to chapter mode and render
			this.viewMode = ViewMode.CHAPTER;
			void this.render();

			// Scroll to the verse after rendering
			setTimeout(() => {
				const verseElements = this.containerEl.querySelectorAll('.bible-verse-number');
				for (let i = 0; i < verseElements.length; i++) {
					const el = verseElements[i];
					if (el.textContent?.trim() === startVerse) {
						el.scrollIntoView({ behavior: 'smooth', block: 'center' });
						// Briefly highlight the target verse
						const verseDiv = el.closest('.bible-verse');
						if (verseDiv) {
							verseDiv.addClass('verse-flash');
							setTimeout(() => verseDiv.removeClass('verse-flash'), 1500);
						}
						break;
					}
				}
			}, 100);
			return;
		}

		// Try chapter-only reference (e.g., "John 3")
		const chapterMatch = reference.match(/^(.+?)\s+(\d+)$/);
		if (chapterMatch) {
			const [, book, chapter] = chapterMatch;
			this.currentBook = book.trim();
			this.currentChapter = parseInt(chapter);
			this.viewMode = ViewMode.CHAPTER;
			void this.render();
			return;
		}

		// Try book-only reference (e.g., "John" -> John chapter 1)
		const bookMatch = reference.match(/^([A-Za-z]+(?:\s+[A-Za-z]+)?)$/);
		if (bookMatch) {
			const bookName = bookMatch[1].trim();
			// Find the book in Bible data
			const bible = this.plugin.getBibleData(this.currentVersion);
			if (bible) {
				for (const book of Object.keys(bible)) {
					if (book.toLowerCase() === bookName.toLowerCase() ||
						book.toLowerCase().startsWith(bookName.toLowerCase())) {
						this.currentBook = book;
						this.currentChapter = 1;
						this.viewMode = ViewMode.CHAPTER;
						void this.render();
						return;
					}
				}
			}
		}
	}

	/**
	 * Navigate to a verse using OSIS reference format (e.g., "Gen.1.1")
	 */
	navigateToVerse(osisRef: string) {
		// Convert OSIS to verse key: "Gen.1.1" -> "Genesis:1:1"
		const verseKey = this.plugin.convertOsisToVerseKey(osisRef);
		if (!verseKey) {
			console.warn(`Could not convert OSIS reference: ${osisRef}`);
			return;
		}

		// Parse verse key: "Genesis:1:1" -> ["Genesis", "1", "1"]
		const parts = verseKey.split(':');
		if (parts.length !== 3) return;

		const book = parts[0];
		const chapter = parts[1];
		const verse = parts[2];

		// Navigate using standard format: "Genesis 1:1"
		this.navigateToReference(`${book} ${chapter}:${verse}`);
	}

	getVerseFromReference(reference: string): string | null {
		// Parse reference
		const match = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
		if (!match) return null;

		const [, book, chapter, startVerse] = match;
		return this.plugin.getVerseText(this.currentVersion, book.trim(), parseInt(chapter), parseInt(startVerse));
	}

	getVerseOfTheDay(): { reference: string; text: string } | null {
		// Get day of year (1-365/366)
		const now = new Date();
		const start = new Date(now.getFullYear(), 0, 0);
		const diff = now.getTime() - start.getTime();
		const oneDay = 1000 * 60 * 60 * 24;
		let dayOfYear = Math.floor(diff / oneDay);

		// Handle day 366 in leap years (use day 365's verse)
		if (dayOfYear > 365) dayOfYear = 365;

		let votd: { book: string; chapter: number; verse: number };

		// Use loaded mapping if available, otherwise fallback to static verses
		if (this.plugin.votdMapping && this.plugin.votdMapping[dayOfYear]) {
			votd = this.plugin.votdMapping[dayOfYear];
		} else {
			// Fallback: Static verses (for when no mapping file exists)
			const fallbackVerses = [
				{ book: 'John', chapter: 3, verse: 16 },
				{ book: 'Psalm', chapter: 23, verse: 1 },
				{ book: 'Proverbs', chapter: 3, verse: 5 },
				{ book: 'Romans', chapter: 8, verse: 28 },
				{ book: 'Philippians', chapter: 4, verse: 13 },
				{ book: 'Isaiah', chapter: 41, verse: 10 },
				{ book: 'Matthew', chapter: 6, verse: 33 },
				{ book: 'Jeremiah', chapter: 29, verse: 11 },
				{ book: 'Psalm', chapter: 46, verse: 1 },
				{ book: '1 Corinthians', chapter: 13, verse: 4 }
			];
			const index = dayOfYear % fallbackVerses.length;
			votd = fallbackVerses[index];
		}

		const text = this.plugin.getVerseText(this.currentVersion, votd.book, votd.chapter, votd.verse);
		if (!text) return null;

		return {
			reference: `${votd.book} ${votd.chapter}:${votd.verse}`,
			text: text
		};
	}

	performSearch(query: string, scope: string) {
		const startTime = performance.now();
		const searchQuery = query.toLowerCase().trim();
		const results: Array<{book: string, chapter: number, verse: number, text: string}> = [];

		// Get search index
		const searchIndex = this.plugin.searchIndexes.get(this.currentVersion);

		if (searchIndex && query.split(/\s+/).length === 1) {
			// OPTIMIZED PATH: Use index for single-word searches
			const word = searchQuery.replace(/[^\w]/g, '');
			const indexResults = searchIndex.index.get(word) || [];

			// Apply scope filtering
			for (const result of indexResults) {
				if (scope === 'current-book' && result.book !== this.currentBook) continue;
				if (scope === 'current-chapter' && (result.book !== this.currentBook || result.chapter !== this.currentChapter)) continue;

				// Verify match (index might have partial words)
				if (result.text.toLowerCase().includes(searchQuery)) {
					results.push(result);
				}
			}

			const endTime = performance.now();
			console.debug(`⚡ Indexed search completed in ${(endTime - startTime).toFixed(2)}ms (${results.length} results)`);
		} else {
			// FALLBACK PATH: Full text search for multi-word or phrase searches
			const booksToSearch = scope === 'current-book'
				? [this.currentBook]
				: scope === 'current-chapter'
				? [this.currentBook]
				: this.plugin.getBooksArray(this.currentVersion);

			// Search through verses
			for (const book of booksToSearch) {
				const chapters = scope === 'current-chapter'
					? [this.currentChapter]
					: this.plugin.getChaptersArray(this.currentVersion, book);

				for (const chapterNum of chapters) {
					const chapter = this.plugin.getChapter(this.currentVersion, book, chapterNum);
					if (!chapter) continue;

					Object.entries(chapter.verses).forEach(([verseNum, verseData]) => {
						const verseText = typeof verseData === 'string' ? verseData : verseData.text;
						if (verseText.toLowerCase().includes(searchQuery)) {
							results.push({
								book,
								chapter: chapterNum,
								verse: parseInt(verseNum),
								text: verseText
							});
						}
					});
				}
			}

			const endTime = performance.now();
		}

		// Display search results
		this.displaySearchResults(query, results, scope);
	}

	displaySearchResults(query: string, results: Array<{book: string, chapter: number, verse: number, text: string}>, scope: string) {
		// Create search results overlay
		const overlay = document.createElement('div');
		overlay.addClass('search-results-overlay');

		const resultsContainer = overlay.createDiv('search-results-container');

		// Header
		const header = resultsContainer.createDiv('search-results-header');
		header.createEl('h3', {
			text: `Search Results for "${query}"`,
			cls: 'search-results-title'
		});

		const scopeText = scope === 'current-book'
			? ` in ${this.currentBook}`
			: scope === 'current-chapter'
			? ` in ${this.currentBook} ${this.currentChapter}`
			: '';

		header.createEl('p', {
			text: `Found ${results.length} result(s)${scopeText}`,
			cls: 'search-results-count'
		});

		const closeBtn = header.createEl('button', {
			text: '✕',
			cls: 'search-results-close'
		});

		// Results list with lazy loading
		const resultsList = resultsContainer.createDiv('search-results-list');

		if (results.length === 0) {
			resultsList.createEl('p', {
				text: 'No results found. Try a different search term.',
				cls: 'search-results-empty'
			});
		} else {
			// LAZY LOADING: Render results in batches for better performance
			const BATCH_SIZE = 50; // Render 50 results at a time
			let currentIndex = 0;

			const renderBatch = () => {
				const endIndex = Math.min(currentIndex + BATCH_SIZE, results.length);
				const batch = results.slice(currentIndex, endIndex);

				batch.forEach(result => {
					const resultItem = resultsList.createDiv('search-result-item');

					const reference = resultItem.createEl('div', {
						text: `${result.book} ${result.chapter}:${result.verse}`,
						cls: 'search-result-reference'
					});

					// Highlight matching text
					const textDiv = resultItem.createDiv('search-result-text');
					this.populateWithHighlightedText(textDiv, result.text, query);

					// Click to navigate
					resultItem.addEventListener('click', () => {
						this.currentBook = result.book;
						this.currentChapter = result.chapter;
						void this.render();
						overlay.remove();
						showToast(`Jumped to ${result.book} ${result.chapter}:${result.verse}`);

						// Scroll to verse
						setTimeout(() => {
							const verseEl = this.containerEl.querySelector(`.bible-verse-number:contains("${result.verse}")`);
							if (verseEl) {
								verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
							}
						}, 100);
					});
				});

				currentIndex = endIndex;

				// If there are more results, show "Load More" button
				if (currentIndex < results.length) {
					const existingLoadMore = resultsList.querySelector('.search-load-more-btn');
					if (existingLoadMore) existingLoadMore.remove();

					const loadMoreBtn = resultsList.createEl('button', {
						text: `Load More (${results.length - currentIndex} remaining)`,
						cls: 'search-load-more-btn'
					});
					loadMoreBtn.addEventListener('click', () => {
						renderBatch();
					});
				}
			};

			// Render first batch immediately
			renderBatch();
		}

		// Close handlers
		closeBtn.addEventListener('click', () => overlay.remove());
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		document.body.appendChild(overlay);
		showToast(`Found ${results.length} result(s)`);
	}

	async searchNotes(query: string) {
		const startTime = performance.now();
		const searchQuery = query.toLowerCase().trim();
		const results: Array<{
			reference: string;
			noteType: NoteType;
			notePath: string;
			preview: string;
			book: string;
			chapter: number;
			verse?: number;
			matchContext: string;
		}> = [];

		// Get all note references
		const allNotes = this.plugin.noteReferences;

		// Search through each note's content
		for (const noteRef of allNotes) {
			const file = this.plugin.app.vault.getAbstractFileByPath(noteRef.notePath);
			if (!file) continue;

			try {
				const content = await this.plugin.app.vault.read(file as any);

				// Split content into frontmatter and body
				const parts = content.split('---');
				const body = parts.length >= 3 ? parts.slice(2).join('---').trim() : content.trim();

				// Check if query matches in the body content (case-insensitive)
				if (body.toLowerCase().includes(searchQuery)) {
					// Extract context around the match (50 chars before and after)
					const matchIndex = body.toLowerCase().indexOf(searchQuery);
					const contextStart = Math.max(0, matchIndex - 50);
					const contextEnd = Math.min(body.length, matchIndex + searchQuery.length + 50);
					let matchContext = body.substring(contextStart, contextEnd);

					// Add ellipsis if truncated
					if (contextStart > 0) matchContext = '...' + matchContext;
					if (contextEnd < body.length) matchContext = matchContext + '...';

					// Build reference string
					let reference = '';
					if (noteRef.noteLevel === 'verse') {
						reference = `${noteRef.book} ${noteRef.chapter}:${noteRef.verse}`;
					} else if (noteRef.noteLevel === 'passage') {
						reference = `${noteRef.book} ${noteRef.chapter}:${noteRef.verse}-${noteRef.endVerse}`;
					} else if (noteRef.noteLevel === 'chapter') {
						reference = `${noteRef.book} ${noteRef.chapter}`;
					} else if (noteRef.noteLevel === 'book') {
						reference = noteRef.book;
					}

					results.push({
						reference,
						noteType: noteRef.noteType || 'personal',
						notePath: noteRef.notePath,
						preview: body.substring(0, 150) + (body.length > 150 ? '...' : ''),
						book: noteRef.book,
						chapter: noteRef.chapter,
						verse: noteRef.verse,
						matchContext
					});
				}
			} catch (error) {
				console.error(`Error reading note ${noteRef.notePath}:`, error);
			}
		}

		const endTime = performance.now();

		// Display note search results
		this.displayNoteSearchResults(query, results);
	}

	displayNoteSearchResults(query: string, results: Array<{
		reference: string;
		noteType: NoteType;
		notePath: string;
		preview: string;
		book: string;
		chapter: number;
		verse?: number;
		matchContext: string;
	}>) {
		// Create search results overlay
		const overlay = document.createElement('div');
		overlay.addClass('search-results-overlay');

		const resultsContainer = overlay.createDiv('search-results-container');

		// Header
		const header = resultsContainer.createDiv('search-results-header');
		header.createEl('h3', {
			text: `📝 Note Search Results for "${query}"`,
			cls: 'search-results-title'
		});

		header.createEl('p', {
			text: `Found ${results.length} note(s) containing "${query}"`,
			cls: 'search-results-count'
		});

		const closeBtn = header.createEl('button', {
			text: '✕',
			cls: 'search-results-close'
		});

		// Results list
		const resultsList = resultsContainer.createDiv('search-results-list');

		if (results.length === 0) {
			resultsList.createEl('p', {
				text: 'No notes found containing this text. Try a different search term.',
				cls: 'search-results-empty'
			});
		} else {
			results.forEach(result => {
				const resultItem = resultsList.createDiv('search-result-item');

				// Note type icon
				const noteTypeInfo = NOTE_TYPES.find(t => t.type === result.noteType);
				const typeIcon = noteTypeInfo?.icon || '📝';
				const typeName = noteTypeInfo?.label || 'Study';

				// Reference with note type
				const referenceEl = resultItem.createEl('div', {
					cls: 'search-result-reference'
				});

				referenceEl.createSpan({
					text: `${typeIcon} `,
					cls: 'search-result-type-icon'
				});

				referenceEl.createSpan({
					text: `${result.reference} (${typeName})`,
					cls: 'search-result-reference-text'
				});

				// Match context (shows where the search term appears)
				const contextEl = resultItem.createEl('div', {
					cls: 'search-result-context'
				});

				// Highlight the search term in the context
				this.populateWithHighlightedText(contextEl, result.matchContext, query);

				// Preview of note content
				const previewEl = resultItem.createEl('div', {
					text: result.preview,
					cls: 'search-result-preview'
				});

				// Action buttons
				const actionsEl = resultItem.createEl('div', {
					cls: 'search-result-actions'
				});

				const goToVerseBtn = actionsEl.createEl('button', {
					cls: 'search-result-action-btn'
				});
				const goToIcon = goToVerseBtn.createSpan({ cls: 'btn-icon' });
				setIcon(goToIcon, 'book-open');
				goToVerseBtn.createSpan({ text: 'Go to Verse' });

				const openNoteBtn = actionsEl.createEl('button', {
					text: '📝 Open Note',
					cls: 'search-result-action-btn'
				});

				// Go to verse handler
				goToVerseBtn.addEventListener('click', () => {
					this.currentBook = result.book;
					this.currentChapter = result.chapter;
					void this.render();
					overlay.remove();
					showToast(`Jumped to ${result.reference}`);
				});

				// Open note handler
				openNoteBtn.addEventListener('click', async () => {
					const file = this.plugin.app.vault.getAbstractFileByPath(result.notePath);
					if (file) {
						const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
						await leaf.openFile(file as any);
						overlay.remove();
						showToast(`Opened note for ${result.reference}`);
					}
				});

				// Click anywhere on result item to open note
				resultItem.style.cursor = 'pointer';
				resultItem.addEventListener('click', (e) => {
					// Don't trigger if clicking buttons
					if ((e.target as HTMLElement).tagName === 'BUTTON') return;

					const file = this.plugin.app.vault.getAbstractFileByPath(result.notePath);
					if (file) {
						const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
						leaf.openFile(file as any);
						overlay.remove();
						showToast(`Opened note for ${result.reference}`);
					}
				});
			});
		}

		// Close handlers
		closeBtn.addEventListener('click', () => overlay.remove());
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		document.body.appendChild(overlay);
		showToast(`Found ${results.length} note(s)`);
	}

	showBookmarksManager() {
		// Create bookmarks overlay
		const overlay = document.createElement('div');
		overlay.addClass('bookmarks-overlay');

		const container = overlay.createDiv('bookmarks-container');

		// Header
		const header = container.createDiv('bookmarks-header');
		header.createEl('h3', {
			text: '⭐ My Bookmarks',
			cls: 'bookmarks-title'
		});

		header.createEl('p', {
			text: `${this.plugin.bookmarks.length} bookmark(s)`,
			cls: 'bookmarks-count'
		});

		const closeBtn = header.createEl('button', {
			text: '✕',
			cls: 'bookmarks-close'
		});

		// Bookmarks list
		const bookmarksList = container.createDiv('bookmarks-list');

		if (this.plugin.bookmarks.length === 0) {
			bookmarksList.createEl('p', {
				text: 'No bookmarks yet. Right-click any verse to add a bookmark.',
				cls: 'bookmarks-empty'
			});
		} else {
			// Sort bookmarks by created date (newest first)
			const sortedBookmarks = [...this.plugin.bookmarks].sort((a, b) => b.createdAt - a.createdAt);

			sortedBookmarks.forEach(bookmark => {
				const bookmarkItem = bookmarksList.createDiv('bookmark-item');


				// Display reference based on bookmark level
				let referenceText = bookmark.book;
				if (bookmark.chapter) {
					referenceText += ` ${bookmark.chapter}`;
					if (bookmark.verse) {
						referenceText += `:${bookmark.verse}`;
						if (bookmark.endVerse) {
							referenceText += `-${bookmark.endVerse}`;
						}
					}
				}

				const reference = bookmarkItem.createEl('div', {
					text: referenceText,
					cls: 'bookmark-reference'
				});

				if (bookmark.text) {
					const textPreview = bookmarkItem.createEl('div', {
						text: bookmark.text.slice(0, 100) + (bookmark.text.length > 100 ? '...' : ''),
						cls: 'bookmark-text'
					});
				}

				// Format date
				const date = new Date(bookmark.createdAt);
				const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
				const createdDate = bookmarkItem.createEl('div', {
					text: `Added: ${dateStr}`,
					cls: 'bookmark-date'
				});

				// Delete button
				const deleteBtn = bookmarkItem.createEl('button', {
					cls: 'bookmark-delete-btn',
					attr: { title: 'Remove bookmark' }
				});
				setIcon(deleteBtn, 'trash-2');

				deleteBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.plugin.removeBookmark(bookmark.id);
					showToast('Bookmark removed');
					// Refresh the bookmarks manager
					overlay.remove();
					this.showBookmarksManager();
				});

				// Click to navigate
				bookmarkItem.addEventListener('click', () => {
					this.currentBook = bookmark.book;
					this.currentChapter = bookmark.chapter || 1;
					void this.render();
					overlay.remove();
					showToast(`Jumped to ${bookmark.book} ${bookmark.chapter}:${bookmark.verse}`);

					// Scroll to verse
					setTimeout(() => {
						const verseEl = this.containerEl.querySelector(`[data-verse="${bookmark.verse}"]`);
						if (verseEl) {
							verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
						}
					}, 100);
				});
			});
		}

		// Close handlers
		closeBtn.addEventListener('click', () => overlay.remove());
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		document.body.appendChild(overlay);
		showToast(`Viewing ${this.plugin.bookmarks.length} bookmark(s)`);
	}

	async showTagBrowser() {
		// Get all tags
		const allTags = await this.plugin.getAllTags();

		// Create tags overlay
		const overlay = document.createElement('div');
		overlay.addClass('tags-overlay');

		const container = overlay.createDiv('tags-container');

		// State: selected tag
		let selectedTag: string | null = null;

		const renderTagBrowser = async () => {
			container.empty();

			// Header
			const header = container.createDiv('tags-header');

			if (selectedTag) {
				// Back button
				const backBtn = header.createEl('button', {
					text: '← Back to Tags',
					cls: 'tags-back-btn'
				});
				backBtn.addEventListener('click', () => {
					selectedTag = null;
					renderTagBrowser();
				});

				header.createEl('h3', {
					text: `🏷️ ${selectedTag}`,
					cls: 'tags-title'
				});
			} else {
				header.createEl('h3', {
					text: '🏷️ All Tags',
					cls: 'tags-title'
				});

				header.createEl('p', {
					text: `${allTags.length} unique tag(s)`,
					cls: 'tags-count'
				});
			}

			const closeBtn = header.createEl('button', {
				text: '✕',
				cls: 'tags-close'
			});

			closeBtn.addEventListener('click', () => overlay.remove());

			// Content area
			const contentArea = container.createDiv('tags-content');

			if (selectedTag) {
				// Show notes with this tag
				await this.renderNotesForTag(contentArea, selectedTag, overlay);
			} else {
				// Show all tags
				this.renderTagsList(contentArea, allTags, (tag: string) => {
					selectedTag = tag;
					renderTagBrowser();
				});
			}
		};

		await renderTagBrowser();

		// Close handlers
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.remove();
			}
		});

		document.body.appendChild(overlay);
		showToast(`Viewing ${allTags.length} tag(s)`);
	}

	renderTagsList(container: HTMLElement, allTags: Array<{tag: string, count: number}>, onTagClick: (tag: string) => void) {
		if (allTags.length === 0) {
			container.createEl('p', {
				text: 'No tags found. Tags are automatically created when you create notes.',
				cls: 'tags-empty'
			});
		} else {
			allTags.forEach(({ tag, count }) => {
				const tagItem = container.createDiv('tag-item');

				// Tag name
				const tagName = tagItem.createEl('div', {
					cls: 'tag-name'
				});

				tagName.createSpan({
					text: '🏷️ ',
					cls: 'tag-icon'
				});

				tagName.createSpan({
					text: tag,
					cls: 'tag-label'
				});

				// Tag count badge
				const tagCount = tagItem.createEl('div', {
					text: `${count}`,
					cls: 'tag-count-badge',
					attr: { title: `${count} note(s) with this tag` }
				});

				// Click to view notes with this tag
				tagItem.addEventListener('click', () => {
					onTagClick(tag);
				});
			});
		}
	}

	async renderNotesForTag(container: HTMLElement, tag: string, overlay: HTMLElement) {
		// Get all notes with this tag
		const notesWithTag: NoteReference[] = [];

		for (const noteRef of this.plugin.noteReferences) {
			const tags = await this.plugin.getNoteTags(noteRef.notePath);
			if (tags.includes(tag)) {
				notesWithTag.push(noteRef);
			}
		}

		if (notesWithTag.length === 0) {
			container.createEl('p', {
				text: `No notes found with tag "${tag}".`,
				cls: 'tags-empty'
			});
			return;
		}

		// Show count
		const countDiv = container.createDiv('tag-notes-count');
		countDiv.createEl('p', {
			text: `${notesWithTag.length} note(s) with this tag`,
			cls: 'tags-count'
		});

		// Show notes
		notesWithTag.forEach(noteRef => {
			const noteItem = container.createDiv('tag-note-item');

			// Note type icon
			const noteTypeInfo = NOTE_TYPES.find(t => t.type === (noteRef.noteType || 'personal'));
			const typeIcon = noteTypeInfo?.icon || '📝';
			const typeName = noteTypeInfo?.label || 'Study';

			// Reference
			let reference = '';
			if (noteRef.noteLevel === 'verse') {
				reference = `${noteRef.book} ${noteRef.chapter}:${noteRef.verse}`;
			} else if (noteRef.noteLevel === 'passage') {
				reference = `${noteRef.book} ${noteRef.chapter}:${noteRef.verse}-${noteRef.endVerse}`;
			} else if (noteRef.noteLevel === 'chapter') {
				reference = `${noteRef.book} ${noteRef.chapter}`;
			} else if (noteRef.noteLevel === 'book') {
				reference = noteRef.book;
			}

			const referenceEl = noteItem.createEl('div', {
				cls: 'tag-note-reference'
			});

			referenceEl.createSpan({
				text: `${typeIcon} `,
				cls: 'tag-note-type-icon'
			});

			referenceEl.createSpan({
				text: `${reference} (${typeName})`,
				cls: 'tag-note-reference-text'
			});

			// Action buttons
			const actionsEl = noteItem.createEl('div', {
				cls: 'tag-note-actions'
			});

			const goToBtn = actionsEl.createEl('button', {
				text: '📖 Go to Verse',
				cls: 'tag-note-action-btn'
			});

			const openNoteBtn = actionsEl.createEl('button', {
				text: '📝 Open Note',
				cls: 'tag-note-action-btn'
			});

			// Go to verse handler
			goToBtn.addEventListener('click', () => {
				this.currentBook = noteRef.book;
				this.currentChapter = noteRef.chapter;
				void this.render();
				overlay.remove();
				showToast(`Jumped to ${reference}`);
			});

			// Open note handler
			openNoteBtn.addEventListener('click', async () => {
				const file = this.plugin.app.vault.getAbstractFileByPath(noteRef.notePath);
				if (file) {
					const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
					await leaf.openFile(file as any);
					overlay.remove();
					showToast(`Opened note for ${reference}`);
				}
			});

			// Click anywhere on item to open note
			noteItem.style.cursor = 'pointer';
			noteItem.addEventListener('click', async (e) => {
				// Don't trigger if clicking buttons
				if ((e.target as HTMLElement).tagName === 'BUTTON') return;

				const file = this.plugin.app.vault.getAbstractFileByPath(noteRef.notePath);
				if (file) {
					const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
					await leaf.openFile(file as any);
					overlay.remove();
					showToast(`Opened note for ${reference}`);
				}
			});
		});
	}

	highlightSearchTerm(text: string, query: string): string {
		const regex = new RegExp(`(${query})`, 'gi');
		return text.replace(regex, '<mark>$1</mark>');
	}

	/**
	 * Populate an element with text that has search terms highlighted using DOM APIs
	 * This is safer than innerHTML for user-provided content
	 */
	populateWithHighlightedText(container: HTMLElement, text: string, query: string): void {
		container.empty();
		if (!query) {
			container.textContent = text;
			return;
		}
		const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(`(${escapedQuery})`, 'gi');
		const parts = text.split(regex);
		parts.forEach(part => {
			if (part.toLowerCase() === query.toLowerCase()) {
				container.createEl('mark', { text: part });
			} else if (part) {
				container.appendText(part);
			}
		});
	}

	jumpToPassage(reference: string) {
		// Parse reference (e.g., "John 3:16" or "Genesis 1" or "Psalm 23:1-6")
		const match = reference.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+))?$/);
		if (!match) {
			showToast('Invalid reference format. Try "John 3:16" or "Genesis 1"');
			return;
		}

		const [, book, chapter, verse] = match;
		const bookName = book.trim();

		// Validate book exists
		const books = this.plugin.getBooksArray(this.currentVersion);
		const matchedBook = books.find(b => b.toLowerCase() === bookName.toLowerCase());

		if (!matchedBook) {
			showToast(`Book "${bookName}" not found`);
			return;
		}

		this.currentBook = matchedBook;
		this.currentChapter = parseInt(chapter);
		void this.render();

		// Scroll to verse if specified
		if (verse) {
			setTimeout(() => {
				const verseEl = this.containerEl.querySelector(`.bible-verse-number:contains("${verse}")`);
				if (verseEl) {
					verseEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			}, 100);
		}

		showToast(`Jumped to ${matchedBook} ${chapter}${verse ? ':' + verse : ''}`);
	}

	async addVerseHighlight(book: string, chapter: number, verse: number, color: string) {
		const verseText = this.plugin.getVerseText(this.currentVersion, book, chapter, verse);
		if (!verseText) return;

		// Check if this is a color change
		const existingHighlights = this.plugin.getHighlightsForVerse(book, chapter, verse);
		const isColorChange = existingHighlights.length > 0;

		const highlight: Highlight = {
			id: `${Date.now()}-${Math.random()}`,
			book,
			chapter,
			verse,
			text: verseText,
			color,
			layer: this.plugin.settings.activeAnnotationLayer
		};

		await this.plugin.addHighlight(highlight);

		// Render and scroll to the verse
		await this.renderAndScrollToVerse(verse);

		// Trigger highlight sweep animation after render
		const verseEl = this.containerEl.querySelector(`.bible-verse[data-verse="${highlight.verse}"]`);
		if (verseEl) {
			verseEl.addClass('just-highlighted');
			setTimeout(() => verseEl.removeClass('just-highlighted'), 600);
		}

		// Show toast
		const colorName = this.plugin.settings.highlightColors.find(c => c.color === color)?.name || 'Color';
		showToast(isColorChange ? `Highlight changed to ${colorName}` : `Highlighted with ${colorName}`);
	}

	async createNoteForVerse(book: string, chapter: number, verse: number) {
		const notePath = await this.plugin.createVerseNote(book, chapter, verse);

		// Open in split pane to the right
		const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(notePath) as any);

		this.plugin.trackNoteCreated(); // Track for study session
		await this.render();
		showToast(`Note created for ${book} ${chapter}:${verse}`);
	}

	async createNoteForVerseWithType(book: string, chapter: number, verse: number, noteType: NoteType) {
		const notePath = await this.plugin.createVerseNote(book, chapter, verse, noteType);

		// Open in split pane to the right
		const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(notePath) as any);

		this.plugin.trackNoteCreated(); // Track for study session
		await this.renderAndScrollToVerse(verse);
		const typeInfo = NOTE_TYPES.find(t => t.type === noteType);
		showToast(`${typeInfo?.icon} ${typeInfo?.label} note created for ${book} ${chapter}:${verse}`);
	}

	async createPassageNote(book: string, chapter: number, startVerse: number, endVerse: number) {
		const notePath = await this.plugin.createPassageNote(book, chapter, startVerse, endVerse);

		// Open in split pane to the right
		const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(notePath) as any);

		this.plugin.trackNoteCreated(); // Track for study session
		await this.renderAndScrollToVerse(startVerse);
		showToast(`Passage note created for ${book} ${chapter}:${startVerse}-${endVerse}`);
	}

	async createChapterNote(book: string, chapter: number) {
		const notePath = await this.plugin.createChapterNote(book, chapter);

		// Open in split pane to the right
		const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(notePath) as any);

		this.plugin.trackNoteCreated(); // Track for study session
		await this.renderAndScrollToVerse(1);
		showToast(`Chapter note created for ${book} ${chapter}`);
	}

	async createBookNote(book: string) {
		const notePath = await this.plugin.createBookNote(book);

		// Open in split pane to the right
		const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
		await leaf.openFile(this.plugin.app.vault.getAbstractFileByPath(notePath) as any);

		this.plugin.trackNoteCreated(); // Track for study session
		await this.renderAndScrollToVerse(1);
		showToast(`Book note created for ${book}`);
	}

	async deleteNoteForVerse(book: string, chapter: number, verse: number) {
		const noteRefs = this.plugin.getNoteReferencesForVerse(book, chapter, verse);
		if (noteRefs.length === 0) return;

		const notePath = noteRefs[0].notePath;

		// Delete the file
		const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
		if (file) {
			await this.plugin.app.vault.delete(file);
		}

		// Remove the reference
		this.plugin.removeNoteReference(book, chapter, verse);

		// Re-render to update UI
		await this.renderAndScrollToVerse(verse);
		showToast(`Note deleted for ${book} ${chapter}:${verse}`);
	}

	async highlightSelectedRange(color: string) {
		if (this.selectedVerseStart === null || this.selectedVerseEnd === null) return;

		// Get combined text for all verses in range
		let combinedText = '';
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);
		if (!chapter) return;

		for (let v = this.selectedVerseStart; v <= this.selectedVerseEnd; v++) {
			const verseData = chapter.verses[v.toString()];
			if (verseData) {
				const verseText = typeof verseData === 'string' ? verseData : verseData.text;
				combinedText += `${v} ${verseText} `;
			}
		}

		const highlight: Highlight = {
			id: `${Date.now()}-${Math.random()}`,
			book: this.currentBook,
			chapter: this.currentChapter,
			verse: this.selectedVerseStart,
			endVerse: this.selectedVerseEnd,
			text: combinedText.trim(),
			color,
			layer: this.plugin.settings.activeAnnotationLayer
		};

		await this.plugin.addHighlight(highlight);

		// Store verse range before clearing
		const startVerse = this.selectedVerseStart;
		const endVerse = this.selectedVerseEnd;

		// Clear selection
		this.selectedVerseStart = null;
		this.selectedVerseEnd = null;

		// Render and scroll to start verse
		await this.renderAndScrollToVerse(startVerse!);

		// Trigger highlight sweep animation on all verses in range
		for (let v = startVerse!; v <= endVerse!; v++) {
			const verseEl = this.containerEl.querySelector(`.bible-verse[data-verse="${v}"]`);
			if (verseEl) {
				verseEl.addClass('just-highlighted');
				setTimeout(() => verseEl.removeClass('just-highlighted'), 600);
			}
		}

		const colorName = this.plugin.settings.highlightColors.find(c => c.color === color)?.name || 'Color';
		showToast(`Highlighted verses ${highlight.verse}-${highlight.endVerse} with ${colorName}`);
	}

	async bookmarkSelectedRange() {
		if (this.selectedVerseStart === null || this.selectedVerseEnd === null) return;

		// Get combined text for all verses in range
		let combinedText = '';
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);
		if (!chapter) return;

		for (let v = this.selectedVerseStart; v <= this.selectedVerseEnd; v++) {
			const verseData = chapter.verses[v.toString()];
			if (verseData) {
				const verseText = typeof verseData === 'string' ? verseData : verseData.text;
				combinedText += `${v} ${verseText} `;
			}
		}

		const bookmark: Bookmark = {
			id: `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
			book: this.currentBook,
			bookmarkLevel: 'verse',
			chapter: this.currentChapter,
			verse: this.selectedVerseStart,
			endVerse: this.selectedVerseEnd,
			text: combinedText.trim(),
			createdAt: Date.now()
		};

		this.plugin.addBookmark(bookmark);

		// Store start verse before clearing
		const startVerse = this.selectedVerseStart;

		// Clear selection
		this.selectedVerseStart = null;
		this.selectedVerseEnd = null;

		// Render and scroll to start verse
		await this.renderAndScrollToVerse(startVerse!);

		// Trigger bookmark pop animation
		const bookmarkIcon = this.containerEl.querySelector(`.bible-verse[data-verse="${startVerse}"] .bookmark-icon`);
		if (bookmarkIcon) {
			bookmarkIcon.addClass('just-added');
			setTimeout(() => bookmarkIcon.removeClass('just-added'), 400);
		}

		showToast(`Bookmarked ${this.currentBook} ${this.currentChapter}:${bookmark.verse}-${bookmark.endVerse}`);
	}

	copyToClipboard(book: string, chapter: number, verse: number, isRange: boolean, version?: string) {
		let textToCopy = '';
		// Use provided version or fall back to currentVersion
		const versionToUse = version || this.currentVersion;
		const calloutTitle = this.plugin.settings.calloutTitle || 'bible';

		if (isRange && this.selectedVerseStart !== null && this.selectedVerseEnd !== null) {
			// Copy range
			const chapterData = this.plugin.getChapter(versionToUse, book, chapter);
			if (!chapterData) return;

			const reference = `${book} ${chapter}:${this.selectedVerseStart}-${this.selectedVerseEnd}`;

			// Format as callout
			textToCopy = `> [!${calloutTitle}] ${reference}\n`;

			for (let v = this.selectedVerseStart; v <= this.selectedVerseEnd; v++) {
				const verseData = chapterData.verses[v.toString()];
				if (verseData) {
					const verseText = typeof verseData === 'string' ? verseData : verseData.text;
					// Bold verse number in callout format
					textToCopy += `> **${v}** ${verseText}\n`;
				}
			}

			// Store start verse before clearing
			const startVerse = this.selectedVerseStart;

			// Clear selection after copying
			this.selectedVerseStart = null;
			this.selectedVerseEnd = null;
			this.renderAndScrollToVerse(startVerse!);
		} else {
			// Copy single verse
			const verseText = this.plugin.getVerseText(versionToUse, book, chapter, verse);
			if (!verseText) return;

			const reference = `${book} ${chapter}:${verse}`;

			// Format as callout with bold verse number
			textToCopy = `> [!${calloutTitle}] ${reference}\n> **${verse}** ${verseText}`;
		}

		// Copy to clipboard
		navigator.clipboard.writeText(textToCopy).then(() => {
			showToast(isRange
				? `Copied verses to clipboard`
				: `Copied verse to clipboard`
			);
		}).catch(err => {
			console.error('Failed to copy to clipboard:', err);
			showToast('Failed to copy to clipboard');
		});
	}

	async exportAsImage(book: string, chapter: number, verse: number, isRange: boolean) {
		let textToExport = '';
		let reference = '';

		if (isRange && this.selectedVerseStart !== null && this.selectedVerseEnd !== null) {
			// Export range
			reference = `${book} ${chapter}:${this.selectedVerseStart}-${this.selectedVerseEnd}`;
			const chapterData = this.plugin.getChapter(this.currentVersion, book, chapter);
			if (!chapterData) return;

			// Build text for all verses in range
			const verses: string[] = [];
			for (let v = this.selectedVerseStart; v <= this.selectedVerseEnd; v++) {
				const verseData = chapterData.verses[v.toString()];
				if (verseData) {
					const verseText = typeof verseData === 'string' ? verseData : verseData.text;
					verses.push(`${v} ${verseText}`);
				}
			}
			textToExport = verses.join('\n\n');

			// Store start verse before clearing
			const startVerse = this.selectedVerseStart;

			// Clear selection after exporting
			this.selectedVerseStart = null;
			this.selectedVerseEnd = null;
			this.renderAndScrollToVerse(startVerse!);
		} else {
			// Export single verse
			reference = `${book} ${chapter}:${verse}`;
			const verseText = this.plugin.getVerseText(this.currentVersion, book, chapter, verse);
			if (!verseText) return;
			textToExport = verseText;
		}

		// Create canvas and render text
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			showToast('Failed to create image canvas');
			return;
		}

		// Calculate canvas size based on text
		const padding = 40;
		const lineHeight = 32;
		const fontSize = 18;
		const maxWidth = 800;

		ctx.font = `${fontSize}px ${this.plugin.settings.fontFamily}`;

		// Split text into lines that fit within maxWidth
		const words = textToExport.split(' ');
		const lines: string[] = [];
		let currentLine = '';

		for (const word of words) {
			const testLine = currentLine ? `${currentLine} ${word}` : word;
			const metrics = ctx.measureText(testLine);
			if (metrics.width > maxWidth - padding * 2) {
				if (currentLine) lines.push(currentLine);
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		}
		if (currentLine) lines.push(currentLine);

		// Set canvas dimensions
		const canvasWidth = maxWidth;
		const canvasHeight = padding * 2 + lineHeight * (lines.length + 2); // +2 for reference and version
		canvas.width = canvasWidth;
		canvas.height = canvasHeight;

		// Fill background
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);

		// Draw reference at top
		ctx.font = `bold ${fontSize + 4}px ${this.plugin.settings.fontFamily}`;
		ctx.fillStyle = '#333333';
		ctx.fillText(reference, padding, padding + fontSize + 4);

		// Draw version below reference
		ctx.font = `${fontSize - 2}px ${this.plugin.settings.fontFamily}`;
		ctx.fillStyle = '#666666';
		ctx.fillText(`(${this.currentVersion})`, padding, padding + fontSize + 4 + lineHeight);

		// Draw verse text
		ctx.font = `${fontSize}px ${this.plugin.settings.fontFamily}`;
		ctx.fillStyle = '#000000';
		let y = padding + fontSize + 4 + lineHeight * 2;
		for (const line of lines) {
			ctx.fillText(line, padding, y);
			y += lineHeight;
		}

		// Convert canvas to blob
		canvas.toBlob(async (blob) => {
			if (!blob) {
				showToast('Failed to create image');
				return;
			}

			// Create filename
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
			const filename = `${book}-${chapter}-${verse}${isRange ? `-${this.selectedVerseEnd}` : ''}-${timestamp}.jpg`;

			// Save to vault
			const folder = this.plugin.settings.imageExportFolder;
			const path = `${folder}/${filename}`;

			try {
				// Ensure folder exists
				const folderExists = await this.app.vault.adapter.exists(folder);
				if (!folderExists) {
					await this.app.vault.createFolder(folder);
				}

				// Convert blob to array buffer
				const arrayBuffer = await blob.arrayBuffer();

				// Write file
				await this.app.vault.adapter.writeBinary(path, arrayBuffer);

				showToast(`Exported to ${path}`);
			} catch (err) {
				console.error('Failed to save image:', err);
				showToast('Failed to save image');
			}
		}, 'image/jpeg', this.plugin.settings.imageExportQuality / 100);
	}

	getContrastColor(hexColor: string): string {
		// Convert hex to RGB
		const r = parseInt(hexColor.slice(1, 3), 16);
		const g = parseInt(hexColor.slice(3, 5), 16);
		const b = parseInt(hexColor.slice(5, 7), 16);

		// Calculate luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		// Return black or white based on luminance
		return luminance > 0.5 ? '#000000' : '#ffffff';
	}

	/**
	 * Render the note preview section in the sidebar
	 * Shows notes for the currently selected verse (including passage, chapter, book notes)
	 */
	renderNotePreviewSection(container: HTMLElement) {
		// Don't show note preview if notes are disabled in nav
		if (this.plugin.settings.showNoteIndicators === false) {
			return;
		}

		const section = container.createDiv({ cls: 'note-preview-section' });

		const header = section.createDiv({ cls: 'note-preview-header' });
		header.createEl('h3', { text: '📝 Notes', cls: 'note-preview-title' });

		const content = section.createDiv({ cls: 'note-preview-content' });

		if (this.previewVerse === null) {
			content.createEl('p', {
				text: 'Click on a verse to see its notes',
				cls: 'note-preview-empty'
			});
			return;
		}

		// Get all notes that overlap with this verse
		const allNotes = this.getOverlappingNotes(this.currentBook, this.currentChapter, this.previewVerse);

		if (allNotes.length === 0) {
			content.createEl('p', {
				text: `No notes for ${this.currentBook} ${this.currentChapter}:${this.previewVerse}`,
				cls: 'note-preview-empty'
			});

			// Add "Create Note" button
			const createBtn = content.createEl('button', {
				text: '+ Create Note',
				cls: 'note-preview-create-btn'
			});
			createBtn.addEventListener('click', async () => {
				await this.createNoteForVerseWithType(
					this.currentBook,
					this.currentChapter,
					this.previewVerse!,
					'personal'
				);
			});
			return;
		}

		// Show verse reference
		content.createEl('div', {
			text: `${this.currentBook} ${this.currentChapter}:${this.previewVerse}`,
			cls: 'note-preview-reference'
		});

		// Render each note
		for (const note of allNotes) {
			const noteCard = content.createDiv({ cls: 'note-preview-card' });

			// Note level badge
			const levelBadge = noteCard.createEl('span', {
				text: note.noteLevel.charAt(0).toUpperCase() + note.noteLevel.slice(1),
				cls: `note-preview-badge note-level-${note.noteLevel}`
			});

			// Note preview text (will be loaded async)
			const previewText = noteCard.createDiv({ cls: 'note-preview-text' });
			previewText.setText('Loading...');

			// Load note content
			this.loadNotePreview(note.notePath, previewText);

			// Open button
			const openBtn = noteCard.createEl('button', {
				text: 'Open',
				cls: 'note-preview-open-btn'
			});
			openBtn.addEventListener('click', async () => {
				const file = this.plugin.app.vault.getAbstractFileByPath(note.notePath);
				if (file) {
					const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
					await leaf.openFile(file as any);
				}
			});
		}

		// Add "Create Note" button at bottom
		const createBtn = content.createEl('button', {
			text: '+ Add Another Note',
			cls: 'note-preview-create-btn'
		});
		createBtn.addEventListener('click', async () => {
			await this.createNoteForVerseWithType(
				this.currentBook,
				this.currentChapter,
				this.previewVerse!,
				'personal'
			);
		});
	}

	/**
	 * Get all notes that overlap with a specific verse
	 * Includes: verse notes, passage notes (where verse falls in range), chapter notes, book notes
	 */
	getOverlappingNotes(book: string, chapter: number, verse: number): NoteReference[] {
		const overlapping: NoteReference[] = [];

		for (const note of this.plugin.noteReferences) {
			// Book-level notes
			if (note.noteLevel === 'book' && note.book === book) {
				overlapping.push(note);
				continue;
			}

			// Chapter-level notes
			if (note.noteLevel === 'chapter' && note.book === book && note.chapter === chapter) {
				overlapping.push(note);
				continue;
			}

			// Verse-level notes (exact match)
			if (note.noteLevel === 'verse' && note.book === book && note.chapter === chapter && note.verse === verse) {
				overlapping.push(note);
				continue;
			}

			// Passage notes (verse falls within range)
			if (note.noteLevel === 'passage' && note.book === book && note.chapter === chapter) {
				const startVerse = note.verse;
				const endVerse = note.endVerse || note.verse;
				if (verse >= startVerse && verse <= endVerse) {
					overlapping.push(note);
				}
			}
		}

		return overlapping;
	}

	/**
	 * Load note content preview into an element
	 * Only shows content from the "Study Notes" section
	 */
	async loadNotePreview(notePath: string, element: HTMLElement) {
		try {
			const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
			if (file) {
				const content = await this.plugin.app.vault.read(file as any);

				// Extract just the Study Notes section content
				let preview = '';
				const studyNotesMatch = content.match(/## Study Notes\s*([\s\S]*?)(?=\n## |\n---|\Z|$)/);
				if (studyNotesMatch && studyNotesMatch[1]) {
					preview = studyNotesMatch[1].trim();
				} else {
					// Fallback: strip frontmatter and show beginning
					preview = content.replace(/^---[\s\S]*?---\s*/, '').trim();
				}

				if (preview.length > 200) {
					preview = preview.substring(0, 200) + '...';
				}
				element.setText(preview || '(No study notes yet)');
			} else {
				element.setText('(Note not found)');
			}
		} catch (error) {
			element.setText('(Error loading note)');
		}
	}

	/**
	 * Update the note preview in the Study Context sidebar when a verse is clicked
	 */
	updateNotePreview() {
		// Check if Study Context sidebar is visible
		const contextSidebar = this.containerEl.querySelector('.context-sidebar');
		if (!contextSidebar) return;

		// Check if the selected verse has a note
		if (!this.selectedVerseStart) return;

		const noteRefs = this.plugin.getNoteReferencesForVerse(
			this.currentBook,
			this.currentChapter,
			this.selectedVerseStart
		);

		const hasNote = noteRefs.length > 0;

		// If we're already on Notes tab, always refresh to update preview (show note or clear it)
		if (this.plugin.settings.contextSidebarTab === 'notes') {
			const contentArea = contextSidebar.querySelector('.context-sidebar-content');
			if (contentArea) {
				this.renderContextSidebarContent(contentArea as HTMLElement);
			}
			return;
		}

		// Only switch to Notes tab if the verse HAS a note
		if (hasNote) {
			this.plugin.settings.contextSidebarTab = 'notes';
			// Re-render the sidebar content
			const contentArea = contextSidebar.querySelector('.context-sidebar-content');
			if (contentArea) {
				this.renderContextSidebarContent(contentArea as HTMLElement);
				// Update tab styling
				contextSidebar.querySelectorAll('.context-tab').forEach(t => t.removeClass('active'));
				const notesTab = contextSidebar.querySelector('.context-tab:last-child');
				if (notesTab) notesTab.addClass('active');
			}
		}
	}

	/**
	 * Render Theographic sidebar showing people, places, and events for the current chapter
	 */
	renderTheographicSidebar(container: HTMLElement) {
		// Note preview section (above Context)
		this.renderNotePreviewSection(container);

		// Sidebar header for Context section
		const header = container.createDiv({ cls: 'theographic-sidebar-header' });
		header.createEl('h3', { text: 'Context', cls: 'theographic-sidebar-title' });

		// Collect all unique people, places, and events mentioned in this chapter
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);
		if (!chapter) return;

		const allPeople: Set<TheographicPerson> = new Set();
		const allPlaces: Set<TheographicPlace> = new Set();
		const allEvents: Set<TheographicEvent> = new Set();

		// Iterate through all verses in the chapter
		const verseNumbers = Object.keys(chapter.verses).map(v => parseInt(v)).sort((a, b) => a - b);

		for (const verseNum of verseNumbers) {
			const { people, places, events } = this.plugin.getTheographicForVerse(
				this.currentBook,
				this.currentChapter,
				verseNum
			);

			people.forEach(p => allPeople.add(p));
			places.forEach(p => allPlaces.add(p));
			events.forEach(e => allEvents.add(e));
		}

		// Render People section
		if (this.plugin.settings.theographicShowPeople && allPeople.size > 0) {
			this.renderTheographicSection(
				container,
				'👥 People',
				Array.from(allPeople),
				(person) => person.fields.displayTitle || person.fields.name,
				(person) => {
					const details: string[] = [];
					if (person.fields.gender) details.push(person.fields.gender);
					if (person.fields.verseCount) details.push(`${person.fields.verseCount} verses`);
					return details.join(' • ');
				},
				'person'
			);
		}

		// Render Places section
		if (this.plugin.settings.theographicShowPlaces && allPlaces.size > 0) {
			this.renderTheographicSection(
				container,
				'📍 Places',
				Array.from(allPlaces),
				(place) => place.fields.displayTitle,
				(place) => {
					const details: string[] = [];
					if (place.fields.featureType) details.push(place.fields.featureType);
					if (place.fields.comment) details.push(place.fields.comment);
					return details.join(' • ');
				},
				'place'
			);
		}

		// Render Events section
		if (this.plugin.settings.theographicShowEvents && allEvents.size > 0) {
			this.renderTheographicSection(
				container,
				'📅 Events',
				Array.from(allEvents),
				(event) => event.fields.title,
				(event) => {
					const details: string[] = [];
					if (event.fields.startDate) {
						const year = parseInt(event.fields.startDate);
						details.push(year < 0 ? `${Math.abs(year)} BC` : `${year} AD`);
					}
					if (event.fields.duration) details.push(event.fields.duration);
					return details.join(' • ');
				},
				'event'
			);
		}

		// Show message if no data
		if (allPeople.size === 0 && allPlaces.size === 0 && allEvents.size === 0) {
			container.createDiv({
				cls: 'theographic-no-data',
				text: 'No contextual data available for this chapter'
			});
		}
	}

	/**
	 * Render a collapsible section in the Theographic sidebar
	 */
	renderTheographicSection<T>(
		container: HTMLElement,
		title: string,
		items: T[],
		getName: (item: T) => string,
		getDetails: (item: T) => string,
		type: 'person' | 'place' | 'event'
	) {
		const section = container.createDiv({ cls: 'theographic-section' });

		// Section header (clickable to collapse/expand)
		const header = section.createDiv({ cls: 'theographic-section-header' });
		const headerText = header.createEl('div', {
			text: `${title} (${items.length})`,
			cls: 'theographic-section-title'
		});

		const toggleIcon = header.createEl('span', {
			text: '▶',
			cls: 'theographic-toggle-icon'
		});

		// Section content
		const content = section.createDiv({ cls: 'theographic-section-content' });
		content.style.display = 'none'; // Start collapsed

		// Populate items
		items.forEach(item => {
			const itemEl = content.createDiv({ cls: 'theographic-item' });

			const nameEl = itemEl.createDiv({
				text: getName(item),
				cls: 'theographic-item-name'
			});

			const detailsText = getDetails(item);
			if (detailsText) {
				itemEl.createDiv({
					text: detailsText,
					cls: 'theographic-item-details'
				});
			}

			// Make clickable to show detail modal
			itemEl.style.cursor = 'pointer';
			itemEl.addEventListener('click', () => {
				new TheographicDetailModal(this.plugin.app, type, item as any, this.plugin, this).open();
			});
		});

		// Toggle collapse/expand
		let isExpanded = false; // Start collapsed
		header.addEventListener('click', () => {
			isExpanded = !isExpanded;
			content.style.display = isExpanded ? 'block' : 'none';
			toggleIcon.textContent = isExpanded ? '▼' : '▶';
		});
	}

	/**
	 * Render People Index view - Browse all people alphabetically
	 */
	renderPeopleIndexMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'theographic-view-header' });
		const h2 = header.createEl('h2', { cls: 'theographic-view-title' });
		const peopleIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(peopleIcon, 'users');
		h2.createSpan({ text: 'People index' });
		header.createEl('p', {
			text: `Browse all ${this.plugin.theographicData.people?.length.toLocaleString() || 0} people mentioned in the Bible`,
			cls: 'theographic-view-description'
		});

		// Filters toolbar
		const filtersDiv = container.createDiv({ cls: 'people-filters-toolbar' });

		// Search filter
		const searchDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		searchDiv.createEl('label', { text: 'Search:', cls: 'people-filter-label' });
		const searchInput = searchDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search by name...',
			cls: 'people-filter-input'
		});

		// Gender filter
		const genderDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		genderDiv.createEl('label', { text: 'Gender:', cls: 'people-filter-label' });
		const genderSelect = genderDiv.createEl('select', { cls: 'people-filter-select' });
		genderSelect.createEl('option', { value: 'all', text: 'All' });
		genderSelect.createEl('option', { value: 'Male', text: 'Male' });
		genderSelect.createEl('option', { value: 'Female', text: 'Female' });

		// Verse count filter
		const verseDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		verseDiv.createEl('label', { text: 'Verses:', cls: 'people-filter-label' });
		const verseSelect = verseDiv.createEl('select', { cls: 'people-filter-select' });
		verseSelect.createEl('option', { value: 'all', text: 'All' });
		verseSelect.createEl('option', { value: '1-10', text: '1-10' });
		verseSelect.createEl('option', { value: '11-50', text: '11-50' });
		verseSelect.createEl('option', { value: '51-100', text: '51-100' });
		verseSelect.createEl('option', { value: '100+', text: '100+' });

		// Testament filter (based on time period - negative years = OT, positive = NT)
		const testamentDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		testamentDiv.createEl('label', { text: 'Testament:', cls: 'people-filter-label' });
		const testamentSelect = testamentDiv.createEl('select', { cls: 'people-filter-select' });
		testamentSelect.createEl('option', { value: 'all', text: 'All' });
		testamentSelect.createEl('option', { value: 'ot', text: 'Old Testament' });
		testamentSelect.createEl('option', { value: 'nt', text: 'New Testament' });

		// Build person -> books mapping from verse data
		const personBooksMap = new Map<string, Set<string>>();
		const allBooksWithPeople = new Set<string>();
		const osisToBook: { [key: string]: string } = {
			'Gen': 'Genesis', 'Exod': 'Exodus', 'Lev': 'Leviticus', 'Num': 'Numbers', 'Deut': 'Deuteronomy',
			'Josh': 'Joshua', 'Judg': 'Judges', 'Ruth': 'Ruth', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
			'1Kgs': '1 Kings', '2Kgs': '2 Kings', '1Chr': '1 Chronicles', '2Chr': '2 Chronicles',
			'Ezra': 'Ezra', 'Neh': 'Nehemiah', 'Esth': 'Esther', 'Job': 'Job', 'Ps': 'Psalms',
			'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes', 'Song': 'Song of Solomon', 'Isa': 'Isaiah',
			'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel', 'Dan': 'Daniel',
			'Hos': 'Hosea', 'Joel': 'Joel', 'Amos': 'Amos', 'Obad': 'Obadiah', 'Jonah': 'Jonah',
			'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Hag': 'Haggai',
			'Zech': 'Zechariah', 'Mal': 'Malachi', 'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke',
			'John': 'John', 'Acts': 'Acts', 'Rom': 'Romans', '1Cor': '1 Corinthians', '2Cor': '2 Corinthians',
			'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phil': 'Philippians', 'Col': 'Colossians',
			'1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '1Tim': '1 Timothy', '2Tim': '2 Timothy',
			'Titus': 'Titus', 'Phlm': 'Philemon', 'Heb': 'Hebrews', 'Jas': 'James', '1Pet': '1 Peter',
			'2Pet': '2 Peter', '1John': '1 John', '2John': '2 John', '3John': '3 John', 'Jude': 'Jude', 'Rev': 'Revelation'
		};

		if (this.plugin.theographicData.verses) {
			for (const verse of this.plugin.theographicData.verses) {
				if (verse.fields.people && verse.fields.people.length > 0) {
					// Extract book from osisRef (e.g., "Gen.1.1" -> "Gen" -> "Genesis")
					const osisRef = verse.fields.osisRef;
					const osisBook = osisRef.split('.')[0];
					const bookName = osisToBook[osisBook] || osisBook;
					allBooksWithPeople.add(bookName);

					for (const personId of verse.fields.people) {
						if (!personBooksMap.has(personId)) {
							personBooksMap.set(personId, new Set());
						}
						personBooksMap.get(personId)!.add(bookName);
					}
				}
			}
		}

		// Book filter
		const bookDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		bookDiv.createEl('label', { text: 'Book:', cls: 'people-filter-label' });
		const bookSelect = bookDiv.createEl('select', { cls: 'people-filter-select' });
		bookSelect.createEl('option', { value: 'all', text: 'All books' });

		// Add books in canonical order
		const canonicalOrder = [
			'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
			'1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
			'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
			'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
			'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
			'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
			'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
			'1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
			'1 John', '2 John', '3 John', 'Jude', 'Revelation'
		];
		for (const book of canonicalOrder) {
			if (allBooksWithPeople.has(book)) {
				bookSelect.createEl('option', { value: book, text: book });
			}
		}

		// Sort options
		const sortDiv = filtersDiv.createDiv({ cls: 'people-filter-group' });
		sortDiv.createEl('label', { text: 'Sort:', cls: 'people-filter-label' });
		const sortSelect = sortDiv.createEl('select', { cls: 'people-filter-select' });
		sortSelect.createEl('option', { value: 'alpha', text: 'Alphabetical' });
		sortSelect.createEl('option', { value: 'verses-desc', text: 'Most verses' });
		sortSelect.createEl('option', { value: 'verses-asc', text: 'Fewest verses' });
		sortSelect.createEl('option', { value: 'time', text: 'Chronological' });

		const contentDiv = container.createDiv({ cls: 'theographic-view-content' });

		const renderPeople = () => {
			contentDiv.empty();

			if (!this.plugin.theographicData.people) {
				contentDiv.createDiv({ text: 'No people data available', cls: 'theographic-no-data' });
				return;
			}

			const searchFilter = searchInput.value.toLowerCase();
			const genderFilter = genderSelect.value;
			const verseFilter = verseSelect.value;
			const testamentFilter = testamentSelect.value;
			const bookFilter = bookSelect.value;
			const sortOption = sortSelect.value;

			// Filter people
			const filteredPeople = this.plugin.theographicData.people.filter(person => {
				const name = person.fields.displayTitle || person.fields.name;

				// Name search
				if (searchFilter && !name.toLowerCase().includes(searchFilter)) {
					return false;
				}

				// Gender filter
				if (genderFilter !== 'all' && person.fields.gender !== genderFilter) {
					return false;
				}

				// Verse count filter
				const verseCount = person.fields.verseCount || 0;
				if (verseFilter !== 'all') {
					if (verseFilter === '1-10' && (verseCount < 1 || verseCount > 10)) return false;
					if (verseFilter === '11-50' && (verseCount < 11 || verseCount > 50)) return false;
					if (verseFilter === '51-100' && (verseCount < 51 || verseCount > 100)) return false;
					if (verseFilter === '100+' && verseCount < 100) return false;
				}

				// Testament filter (OT = minYear < 0 or unknown, NT = minYear >= -5 to account for Jesus' birth)
				if (testamentFilter !== 'all') {
					const minYear = person.fields.minYear;
					const maxYear = person.fields.maxYear;
					// If we have year data, use it
					if (minYear !== undefined || maxYear !== undefined) {
						const year = minYear ?? maxYear ?? 0;
						if (testamentFilter === 'ot' && year > -5) return false;
						if (testamentFilter === 'nt' && year < -5) return false;
					} else {
						// No year data - include in OT by default (most people are OT)
						if (testamentFilter === 'nt') return false;
					}
				}

				// Book filter - check if person appears in selected book
				if (bookFilter !== 'all') {
					const personBooks = personBooksMap.get(person.id);
					if (!personBooks || !personBooks.has(bookFilter)) {
						return false;
					}
				}

				return true;
			});

			// Sort based on selected option
			const sortedPeople = [...filteredPeople];
			if (sortOption === 'alpha') {
				sortedPeople.sort((a, b) => {
					const nameA = a.fields.displayTitle || a.fields.name;
					const nameB = b.fields.displayTitle || b.fields.name;
					return nameA.localeCompare(nameB);
				});
			} else if (sortOption === 'verses-desc') {
				sortedPeople.sort((a, b) => (b.fields.verseCount || 0) - (a.fields.verseCount || 0));
			} else if (sortOption === 'verses-asc') {
				sortedPeople.sort((a, b) => (a.fields.verseCount || 0) - (b.fields.verseCount || 0));
			} else if (sortOption === 'time') {
				sortedPeople.sort((a, b) => {
					const yearA = a.fields.minYear ?? a.fields.maxYear ?? 0;
					const yearB = b.fields.minYear ?? b.fields.maxYear ?? 0;
					return yearA - yearB;
				});
			}

			// Helper to render a person card
			const renderPersonCard = (person: TheographicPerson, container: HTMLElement) => {
				const personCard = container.createDiv({ cls: 'person-card' });

				personCard.createDiv({
					text: person.fields.displayTitle || person.fields.name,
					cls: 'person-card-name'
				});

				// Details
				const details: string[] = [];
				if (person.fields.gender) details.push(person.fields.gender);
				if (person.fields.verseCount) details.push(`${person.fields.verseCount} verses`);
				if (sortOption === 'time' && (person.fields.minYear || person.fields.maxYear)) {
					const year = person.fields.minYear ?? person.fields.maxYear;
					if (year) {
						details.push(year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`);
					}
				}

				if (details.length > 0) {
					personCard.createDiv({
						text: details.join(' • '),
						cls: 'person-card-details'
					});
				}

				personCard.style.cursor = 'pointer';
				personCard.addEventListener('click', () => {
					new TheographicDetailModal(this.plugin.app, 'person', person, this.plugin, this).open();
				});
			};

			// Render based on sort type
			if (sortOption === 'alpha') {
				// Group by first letter for alphabetical sort
				const grouped: { [letter: string]: TheographicPerson[] } = {};
				sortedPeople.forEach(person => {
					const name = person.fields.displayTitle || person.fields.name;
					const firstLetter = name.charAt(0).toUpperCase();
					if (!grouped[firstLetter]) grouped[firstLetter] = [];
					grouped[firstLetter].push(person);
				});

				const letters = Object.keys(grouped).sort();
				letters.forEach(letter => {
					const section = contentDiv.createDiv({ cls: 'people-letter-section' });
					section.createEl('h3', { text: letter, cls: 'people-letter-heading' });

					const peopleList = section.createDiv({ cls: 'people-list' });
					grouped[letter].forEach(person => renderPersonCard(person, peopleList));
				});
			} else {
				// Flat list for other sorts
				const peopleList = contentDiv.createDiv({ cls: 'people-list people-list-flat' });
				sortedPeople.forEach(person => renderPersonCard(person, peopleList));
			}

			// Show count
			contentDiv.createDiv({
				text: `Showing ${filteredPeople.length} of ${this.plugin.theographicData.people.length} people`,
				cls: 'theographic-result-count'
			});
		};

		// Initial render
		renderPeople();

		// Filter handlers
		searchInput.addEventListener('input', () => renderPeople());
		genderSelect.addEventListener('change', () => renderPeople());
		verseSelect.addEventListener('change', () => renderPeople());
		testamentSelect.addEventListener('change', () => renderPeople());
		bookSelect.addEventListener('change', () => renderPeople());
		sortSelect.addEventListener('change', () => renderPeople());
	}

	/**
	 * Render Map View - Geographic visualization of biblical places
	 */
	renderMapViewMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'theographic-view-header' });
		const h2 = header.createEl('h2', { cls: 'theographic-view-title' });
		const mapIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(mapIcon, 'map');
		h2.createSpan({ text: 'Biblical places' });
		header.createEl('p', {
			text: `Browse ${this.plugin.theographicData.places?.length.toLocaleString() || 0} biblical locations`,
			cls: 'theographic-view-description'
		});

		// Places list
		const sidebarDiv = container.createDiv({ cls: 'theographic-map-sidebar' });
		sidebarDiv.createEl('h3', { text: 'Places', cls: 'map-sidebar-title' });

		const searchDiv = sidebarDiv.createDiv({ cls: 'theographic-search' });
		const searchInput = searchDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search places...',
			cls: 'theographic-search-input'
		});

		const placesList = sidebarDiv.createDiv({ cls: 'map-places-list' });

		const renderPlaces = (filter: string = '') => {
			placesList.empty();

			if (!this.plugin.theographicData.places) {
				placesList.createDiv({ text: 'No places data available', cls: 'theographic-no-data' });
				return;
			}

			// Filter places with coordinates
			const placesWithCoords = this.plugin.theographicData.places.filter(place => {
				const hasCoords = place.fields.latitude && place.fields.longitude;
				const name = place.fields.displayTitle;
				const matchesFilter = name.toLowerCase().includes(filter.toLowerCase());
				return hasCoords && matchesFilter;
			});

			// Group by type
			const grouped: { [type: string]: TheographicPlace[] } = {};
			placesWithCoords.forEach(place => {
				const type = place.fields.featureType || 'Unknown';
				if (!grouped[type]) grouped[type] = [];
				grouped[type].push(place);
			});

			// Render by type
			Object.keys(grouped).sort().forEach(type => {
				const typeSection = placesList.createDiv({ cls: 'map-type-section' });
				typeSection.createEl('h4', { text: `${type} (${grouped[type].length})`, cls: 'map-type-heading' });

				grouped[type].forEach(place => {
					const placeItem = typeSection.createDiv({ cls: 'map-place-item' });

					placeItem.createDiv({
						text: place.fields.displayTitle,
						cls: 'map-place-name'
					});

					if (place.fields.comment) {
						placeItem.createDiv({
							text: place.fields.comment,
							cls: 'map-place-comment'
						});
					}

					placeItem.style.cursor = 'pointer';
					placeItem.addEventListener('click', () => {
						new TheographicDetailModal(this.plugin.app, 'place', place, this.plugin, this).open();
					});
				});
			});

			placesList.createDiv({
				text: `${placesWithCoords.length} places with coordinates`,
				cls: 'theographic-result-count'
			});
		};

		renderPlaces();

		searchInput.addEventListener('input', () => {
			renderPlaces(searchInput.value);
		});
	}

	/**
	 * Render Timeline View - Chronological browser of biblical events
	 */
	renderTimelineViewMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'theographic-view-header' });
		const h2 = header.createEl('h2', { cls: 'theographic-view-title' });
		const timelineIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(timelineIcon, 'calendar');
		h2.createSpan({ text: 'Biblical timeline' });
		header.createEl('p', {
			text: `Explore ${this.plugin.theographicData.events?.length.toLocaleString() || 0} biblical events in chronological order`,
			cls: 'theographic-view-description'
		});

		// Filter controls
		const filterDiv = container.createDiv({ cls: 'timeline-filters' });

		const searchInput = filterDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search events...',
			cls: 'theographic-search-input'
		});

		const periodSelect = filterDiv.createEl('select', { cls: 'timeline-period-select' });
		periodSelect.createEl('option', { value: 'all', text: 'All periods' });
		periodSelect.createEl('option', { value: 'creation', text: 'Creation & Early History' });
		periodSelect.createEl('option', { value: 'patriarchs', text: 'Patriarchs (2000-1500 BC)' });
		periodSelect.createEl('option', { value: 'exodus', text: 'Exodus & Conquest (1500-1000 BC)' });
		periodSelect.createEl('option', { value: 'kingdom', text: 'United & Divided Kingdom (1000-586 BC)' });
		periodSelect.createEl('option', { value: 'exile', text: 'Exile & Return (586-400 BC)' });
		periodSelect.createEl('option', { value: 'nt', text: 'New Testament Era (0-100 AD)' });

		const timelineDiv = container.createDiv({ cls: 'timeline-content' });

		const renderTimeline = (searchFilter: string = '', periodFilter: string = 'all') => {
			timelineDiv.empty();

			if (!this.plugin.theographicData.events) {
				timelineDiv.createDiv({ text: 'No events data available', cls: 'theographic-no-data' });
				return;
			}

			// Filter events
			let filteredEvents = this.plugin.theographicData.events.filter(event => {
				const title = event.fields.title || '';
				const matchesSearch = title.toLowerCase().includes(searchFilter.toLowerCase());

				// Period filter
				let matchesPeriod = true;
				if (periodFilter !== 'all' && event.fields.startDate) {
					const year = parseInt(event.fields.startDate);
					switch (periodFilter) {
						case 'creation': matchesPeriod = year < -2000; break;
						case 'patriarchs': matchesPeriod = year >= -2000 && year < -1500; break;
						case 'exodus': matchesPeriod = year >= -1500 && year < -1000; break;
						case 'kingdom': matchesPeriod = year >= -1000 && year < -586; break;
						case 'exile': matchesPeriod = year >= -586 && year < -400; break;
						case 'nt': matchesPeriod = year >= 0 && year <= 100; break;
					}
				}

				return matchesSearch && matchesPeriod;
			});

			// Sort by date
			filteredEvents.sort((a, b) => {
				const dateA = a.fields.sortKey || parseFloat(a.fields.startDate || '0');
				const dateB = b.fields.sortKey || parseFloat(b.fields.startDate || '0');
				return dateA - dateB;
			});

			// Render events
			filteredEvents.forEach(event => {
				const eventCard = timelineDiv.createDiv({ cls: 'timeline-event-card' });

				// Date
				if (event.fields.startDate) {
					const year = parseInt(event.fields.startDate);
					const dateText = year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
					eventCard.createDiv({ text: dateText, cls: 'timeline-event-date' });
				}

				// Title
				eventCard.createDiv({
					text: event.fields.title,
					cls: 'timeline-event-title'
				});

				// Duration
				if (event.fields.duration) {
					eventCard.createDiv({
						text: `Duration: ${event.fields.duration}`,
						cls: 'timeline-event-duration'
					});
				}

				eventCard.style.cursor = 'pointer';
				eventCard.addEventListener('click', () => {
					new TheographicDetailModal(this.plugin.app, 'event', event, this.plugin, this).open();
				});
			});

			timelineDiv.createDiv({
				text: `Showing ${filteredEvents.length} events`,
				cls: 'theographic-result-count'
			});
		};

		renderTimeline();

		searchInput.addEventListener('input', () => {
			renderTimeline(searchInput.value, periodSelect.value);
		});

		periodSelect.addEventListener('change', () => {
			renderTimeline(searchInput.value, periodSelect.value);
		});
	}

	// Calculate analytics for the Notes Browser
	async calculateNotesAnalytics(): Promise<{
		totalNotes: number;
		totalWordCount: number;
		notesByBook: Map<string, number>;
		topChapters: Array<{book: string, chapter: number, count: number}>;
		recentActivity: Array<{date: string, count: number}>;
		currentStreak: number;
	}> {
		const notesByBook = new Map<string, number>();
		const chapterCounts = new Map<string, number>();
		let totalWordCount = 0;

		// Count notes by book and chapter
		for (const note of this.plugin.noteReferences) {
			// By book
			notesByBook.set(note.book, (notesByBook.get(note.book) || 0) + 1);

			// By chapter
			const chapterKey = `${note.book}|${note.chapter}`;
			chapterCounts.set(chapterKey, (chapterCounts.get(chapterKey) || 0) + 1);

			// Word count - read file content
			try {
				const file = this.app.vault.getAbstractFileByPath(note.notePath);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					totalWordCount += content.split(/\s+/).filter(w => w.length > 0).length;
				}
			} catch (e) {
				// File might not exist
			}
		}

		// Top 5 chapters
		const topChapters = Array.from(chapterCounts.entries())
			.map(([key, count]) => {
				const [book, chapter] = key.split('|');
				return { book, chapter: parseInt(chapter), count };
			})
			.sort((a, b) => b.count - a.count)
			.slice(0, 5);

		// Recent activity (last 7 days) - based on file modification times
		const now = Date.now();
		const dayMs = 24 * 60 * 60 * 1000;
		const recentActivity: Array<{date: string, count: number}> = [];

		for (let i = 6; i >= 0; i--) {
			const dayStart = now - (i * dayMs);
			const dayEnd = dayStart + dayMs;
			const dateStr = new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' });

			let count = 0;
			for (const note of this.plugin.noteReferences) {
				try {
					const file = this.app.vault.getAbstractFileByPath(note.notePath);
					if (file instanceof TFile) {
						const mtime = file.stat.mtime;
						if (mtime >= dayStart && mtime < dayEnd) {
							count++;
						}
					}
				} catch (e) {}
			}
			recentActivity.push({ date: dateStr, count });
		}

		// Calculate streak (consecutive days with activity, counting backwards from today)
		let currentStreak = 0;
		for (let i = 0; i < 365; i++) {
			const dayStart = now - (i * dayMs);
			const dayEnd = dayStart + dayMs;

			let hasActivity = false;
			for (const note of this.plugin.noteReferences) {
				try {
					const file = this.app.vault.getAbstractFileByPath(note.notePath);
					if (file instanceof TFile) {
						const mtime = file.stat.mtime;
						if (mtime >= dayStart && mtime < dayEnd) {
							hasActivity = true;
							break;
						}
					}
				} catch (e) {}
			}

			if (hasActivity) {
				currentStreak++;
			} else if (i > 0) { // Allow today to have no activity yet
				break;
			}
		}

		return {
			totalNotes: this.plugin.noteReferences.length,
			totalWordCount,
			notesByBook,
			topChapters,
			recentActivity,
			currentStreak
		};
	}

	renderNotesBrowserMode(container: HTMLElement) {
		// Track selected note for preview panel
		let selectedNote: NoteReference | null = null;

		// Main container with class for styling
		const mainContainer = container.createDiv({ cls: 'notes-browser' });

		// ===== HEADER =====
		const header = mainContainer.createDiv({ cls: 'notes-browser-header' });
		const headerTop = header.createDiv({ cls: 'notes-header-top' });
		headerTop.createEl('h2', { text: '📝 Reflections Hub', cls: 'notes-browser-title' });

		// Action buttons
		const actionsDiv = headerTop.createDiv({ cls: 'notes-actions' });

		// Find Orphans button
		const orphanBtn = actionsDiv.createEl('button', {
			text: '🔍 Find Orphans',
			cls: 'notes-action-btn',
			attr: { title: 'Find notes with missing files' }
		});
		orphanBtn.addEventListener('click', async () => {
			const orphanedNotes: NoteReference[] = [];
			for (const noteRef of this.plugin.noteReferences) {
				const file = this.app.vault.getAbstractFileByPath(noteRef.notePath);
				if (!(file instanceof TFile)) {
					orphanedNotes.push(noteRef);
				}
			}
			if (orphanedNotes.length === 0) {
				showToast('No orphaned notes found - all references are valid!');
				return;
			}
			// Show confirmation to remove orphans
			const orphanList = orphanedNotes.slice(0, 5).map(n => `• ${n.book} ${n.chapter}:${n.verse}`).join('\n') +
				(orphanedNotes.length > 5 ? `\n... and ${orphanedNotes.length - 5} more` : '')
			const confirmRemove = await showConfirmModal(
				this.app,
				'Remove orphaned references?',
				`Found ${orphanedNotes.length} orphaned note reference${orphanedNotes.length > 1 ? 's' : ''} (files no longer exist):\n\n${orphanList}`,
				{ confirmText: 'Remove', isDestructive: true }
			);
			if (confirmRemove) {
				const validNotes = this.plugin.noteReferences.filter(noteRef => {
					const file = this.app.vault.getAbstractFileByPath(noteRef.notePath);
					return file instanceof TFile;
				});
				this.plugin.noteReferences = validNotes;
				await this.plugin.saveHighlightsAndNotes();
				showToast(`Removed ${orphanedNotes.length} orphaned reference${orphanedNotes.length > 1 ? 's' : ''}`);
				await this.render();
			}
		});

		// Export button
		const exportBtn = actionsDiv.createEl('button', {
			text: '📤 Export',
			cls: 'notes-action-btn'
		});
		exportBtn.addEventListener('click', async () => {
			if (this.plugin.noteReferences.length === 0) {
				showToast('No notes to export');
				return;
			}
			const notesWithContent: Array<{
				book: string;
				chapter: number;
				verse: number;
				endVerse?: number;
				noteLevel: string;
				noteType: string;
				filename: string;
				content: string;
			}> = [];
			for (const noteRef of this.plugin.noteReferences) {
				const file = this.app.vault.getAbstractFileByPath(noteRef.notePath);
				if (file instanceof TFile) {
					const content = await this.app.vault.read(file);
					// Generate filename from reference (without path)
					const filename = noteRef.notePath.split('/').pop() || `${noteRef.book} ${noteRef.chapter}_${noteRef.verse} - ${noteRef.noteLevel} note.md`;
					notesWithContent.push({
						book: noteRef.book,
						chapter: noteRef.chapter,
						verse: noteRef.verse,
						endVerse: noteRef.endVerse,
						noteLevel: noteRef.noteLevel,
						noteType: noteRef.noteType,
						filename,
						content
					});
				}
			}
			const exportData = {
				exportDate: new Date().toISOString(),
				version: '2.1',
				noteCount: notesWithContent.length,
				notes: notesWithContent
			};
			const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `bible-notes-${new Date().toISOString().split('T')[0]}.json`;
			link.click();
			URL.revokeObjectURL(url);
			showToast(`Exported ${notesWithContent.length} notes`);
		});

		// Import button
		const importBtn = actionsDiv.createEl('button', {
			text: '📥 Import',
			cls: 'notes-action-btn'
		});
		importBtn.addEventListener('click', async () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';
			input.onchange = async (e: Event) => {
				const target = e.target as HTMLInputElement;
				const file = target.files?.[0];
				if (!file) return;
				try {
					const text = await file.text();
					const importData = JSON.parse(text);
					// Support v2.0 (with notePath), v2.1 (with filename), and legacy formats
					const isV2Plus = (importData.version === '2.0' || importData.version === '2.1') && importData.notes;
					const notesToImport = isV2Plus ? importData.notes : importData.noteReferences;
					if (!notesToImport || !Array.isArray(notesToImport)) {
						showToast('Invalid format');
						return;
					}

					// Use settings folder for all imports
					const notesFolder = this.plugin.settings.notesFolder || 'Bible Notes';

					// Ensure notes folder exists
					if (!this.app.vault.getAbstractFileByPath(notesFolder)) {
						await this.app.vault.createFolder(notesFolder);
					}

					let imported = 0, filesCreated = 0, skipped = 0;
					for (const note of notesToImport) {
						// Generate filename: use exported filename, or create from metadata
						let filename: string;
						if (note.filename) {
							// v2.1 format - use the filename directly
							filename = note.filename;
						} else if (note.notePath) {
							// v2.0 format - extract filename from path
							filename = note.notePath.split('/').pop() || `${note.book} ${note.chapter}_${note.verse} - ${note.noteLevel} note.md`;
						} else {
							// Generate from metadata
							filename = `${note.book} ${note.chapter}_${note.verse} - ${note.noteLevel} note.md`;
						}

						// Build full path using settings folder
						const fullPath = `${notesFolder}/${filename}`;

						// Check if this reference already exists (by book/chapter/verse/level)
						const existingRef = this.plugin.noteReferences.find(n =>
							n.book === note.book &&
							n.chapter === note.chapter &&
							n.verse === note.verse &&
							n.noteLevel === note.noteLevel
						);

						if (existingRef) {
							skipped++;
							continue;
						}

						// Create the file if we have content
						if (note.content) {
							try {
								if (!this.app.vault.getAbstractFileByPath(fullPath)) {
									await this.app.vault.create(fullPath, note.content);
									filesCreated++;
								}
							} catch (e) { console.error('Error creating note file:', e); }
						}

						// Add reference
						this.plugin.noteReferences.push({
							book: note.book,
							chapter: note.chapter,
							verse: note.verse,
							endVerse: note.endVerse,
							noteLevel: note.noteLevel,
							noteType: note.noteType,
							notePath: fullPath
						});
						imported++;
					}
					await this.plugin.saveHighlightsAndNotes();
					await this.render();
					let msg = `Imported ${imported} notes`;
					if (filesCreated > 0) msg += ` (${filesCreated} files created)`;
					if (skipped > 0) msg += `, ${skipped} skipped`;
					showToast(msg);
				} catch (e) {
					console.error('Import error:', e);
					showToast('Import failed');
				}
			};
			input.click();
		});

		// ===== ANALYTICS DASHBOARD (Collapsible) =====
		const analyticsDashboard = mainContainer.createDiv({ cls: 'notes-analytics-dashboard' });
		let showAnalytics = true;

		const analyticsHeader = analyticsDashboard.createDiv({ cls: 'analytics-header' });
		analyticsHeader.createEl('h3', { text: '📊 Notes Analytics' });
		const toggleAnalyticsBtn = analyticsHeader.createEl('button', { cls: 'analytics-toggle-btn' });
		setIcon(toggleAnalyticsBtn, 'chevron-down');

		const analyticsContent = analyticsDashboard.createDiv({ cls: 'analytics-content' });

		toggleAnalyticsBtn.addEventListener('click', () => {
			showAnalytics = !showAnalytics;
			toggleAnalyticsBtn.toggleClass('collapsed', !showAnalytics);
			analyticsContent.toggleClass('collapsed', !showAnalytics);
		});

		const renderAnalytics = async () => {
			analyticsContent.empty();
			analyticsContent.createEl('div', { text: 'Loading analytics...', cls: 'analytics-loading' });

			const analytics = await this.calculateNotesAnalytics();
			analyticsContent.empty();

			// Stats row
			const statsRow = analyticsContent.createDiv({ cls: 'analytics-stats-row' });

			const statCard = (icon: string, value: string | number, label: string) => {
				const card = statsRow.createDiv({ cls: 'analytics-stat-card' });
				card.createEl('div', { text: icon, cls: 'stat-icon' });
				card.createEl('div', { text: String(value), cls: 'stat-value' });
				card.createEl('div', { text: label, cls: 'stat-label' });
			};

			statCard('📝', analytics.totalNotes, 'Total notes');
			statCard('📖', analytics.totalWordCount.toLocaleString(), 'Total words');
			statCard('🔥', analytics.currentStreak, 'Day streak');
			statCard('📚', analytics.notesByBook.size, 'Books covered');

			// Two column layout for charts
			const chartsRow = analyticsContent.createDiv({ cls: 'analytics-charts-row' });

			// Left: Notes by Book (bar chart)
			const bookChartSection = chartsRow.createDiv({ cls: 'analytics-chart-section' });
			bookChartSection.createEl('h4', { text: 'Notes by Book' });
			const bookChart = bookChartSection.createDiv({ cls: 'analytics-bar-chart' });

			// Sort by count and show top 10
			const sortedBooks = Array.from(analytics.notesByBook.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10);
			const maxBookCount = sortedBooks.length > 0 ? sortedBooks[0][1] : 1;

			sortedBooks.forEach(([book, count]) => {
				const barRow = bookChart.createDiv({ cls: 'bar-row' });
				barRow.createEl('span', { text: book, cls: 'bar-label' });
				const barContainer = barRow.createDiv({ cls: 'bar-container' });
				const bar = barContainer.createDiv({ cls: 'bar-fill' });
				bar.style.width = `${(count / maxBookCount) * 100}%`;
				barRow.createEl('span', { text: String(count), cls: 'bar-value' });
			});

			if (sortedBooks.length === 0) {
				bookChart.createEl('div', { text: 'No notes yet', cls: 'no-data' });
			}

			// Right: Top Chapters + Activity
			const rightSection = chartsRow.createDiv({ cls: 'analytics-chart-section' });

			// Top Chapters
			rightSection.createEl('h4', { text: 'Hot spots (top chapters)' });
			const topChaptersList = rightSection.createDiv({ cls: 'analytics-top-list' });
			analytics.topChapters.forEach((ch, i) => {
				const item = topChaptersList.createDiv({ cls: 'top-list-item' });
				item.createEl('span', { text: `${i + 1}.`, cls: 'top-rank' });
				item.createEl('span', { text: `${ch.book} ${ch.chapter}`, cls: 'top-name' });
				item.createEl('span', { text: `${ch.count} notes`, cls: 'top-count' });
			});
			if (analytics.topChapters.length === 0) {
				topChaptersList.createEl('div', { text: 'No notes yet', cls: 'no-data' });
			}

			// Recent Activity (7-day sparkline)
			rightSection.createEl('h4', { text: 'Recent activity', cls: 'activity-header' });
			const activityChart = rightSection.createDiv({ cls: 'analytics-activity-chart' });
			const maxActivity = Math.max(...analytics.recentActivity.map(a => a.count), 1);

			analytics.recentActivity.forEach(day => {
				const dayCol = activityChart.createDiv({ cls: 'activity-day' });
				const bar = dayCol.createDiv({ cls: 'activity-bar' });
				const height = day.count > 0 ? Math.max(20, (day.count / maxActivity) * 100) : 5;
				bar.style.height = `${height}%`;
				if (day.count > 0) bar.addClass('has-activity');
				dayCol.createEl('span', { text: day.date, cls: 'activity-label' });
			});
		};

		// ===== CONTROLS BAR =====
		const controlsBar = mainContainer.createDiv({ cls: 'notes-controls-bar' });

		// Search input with content search toggle
		const searchWrapper = controlsBar.createDiv({ cls: 'notes-search-wrapper' });
		const searchInput = searchWrapper.createEl('input', {
			type: 'text',
			placeholder: 'Search notes...',
			cls: 'notes-search-input'
		});

		// Content search checkbox
		const contentSearchLabel = searchWrapper.createEl('label', { cls: 'content-search-label' });
		const contentSearchCheckbox = contentSearchLabel.createEl('input', {
			type: 'checkbox',
			cls: 'content-search-checkbox'
		});
		contentSearchLabel.appendText(' Search content');

		// Content search cache
		const noteContentCache = new Map<string, string>();

		// Book filter (Note: Type filter removed - only one note type exists now)
		const bookFilter = controlsBar.createEl('select', { cls: 'notes-filter-select' });
		bookFilter.createEl('option', { value: 'all', text: 'All books' });
		const booksWithNotes = new Set(this.plugin.noteReferences.map(n => n.book));
		const allBooks = this.plugin.getBooksArray(this.currentVersion);
		allBooks.filter(b => booksWithNotes.has(b)).forEach(book => {
			bookFilter.createEl('option', { value: book, text: book });
		});

		// Sort dropdown
		const sortSelect = controlsBar.createEl('select', { cls: 'notes-filter-select' });
		sortSelect.createEl('option', { value: 'book', text: 'Sort: Book Order' });
		sortSelect.createEl('option', { value: 'recent', text: 'Sort: Recent First' });
		sortSelect.createEl('option', { value: 'alpha', text: 'Sort: A-Z' });

		// Random Note button (Phase 6)
		const randomBtn = controlsBar.createEl('button', {
			text: '🎲 Random',
			cls: 'notes-action-btn',
			attr: { title: 'Open a random note' }
		});

		// Bulk mode toggle and state
		let bulkMode = false;
		const selectedForBulk = new Set<string>(); // Store note paths

		const bulkActionsDiv = controlsBar.createDiv({ cls: 'notes-bulk-actions hidden' });

		// Bulk select toggle
		const bulkToggleBtn = controlsBar.createEl('button', {
			cls: 'notes-action-btn bulk-toggle-btn',
			attr: { title: 'Toggle bulk selection mode' }
		});
		const bulkToggleIcon = bulkToggleBtn.createSpan({ cls: 'bulk-icon' });
		setIcon(bulkToggleIcon, 'check-square');
		bulkToggleBtn.createSpan({ text: ' Select' });

		// Bulk delete button (in bulk actions div)
		const bulkDeleteBtn = bulkActionsDiv.createEl('button', {
			cls: 'notes-action-btn bulk-delete-btn',
			attr: { title: 'Delete selected notes' }
		});
		const bulkDeleteIcon = bulkDeleteBtn.createSpan({ cls: 'bulk-icon' });
		setIcon(bulkDeleteIcon, 'trash-2');
		bulkDeleteBtn.createSpan({ text: ' Delete', cls: 'bulk-count' });

		// Select all / deselect all
		const bulkSelectAllBtn = bulkActionsDiv.createEl('button', {
			text: 'All',
			cls: 'notes-action-btn',
			attr: { title: 'Select all visible notes' }
		});

		const bulkDeselectBtn = bulkActionsDiv.createEl('button', {
			text: 'None',
			cls: 'notes-action-btn',
			attr: { title: 'Deselect all' }
		});

		// Bulk mode toggle handler
		bulkToggleBtn.addEventListener('click', () => {
			bulkMode = !bulkMode;
			bulkToggleBtn.toggleClass('active', bulkMode);
			bulkActionsDiv.toggleClass('hidden', !bulkMode);
			if (!bulkMode) {
				selectedForBulk.clear();
			}
			renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
		});

		// Update bulk delete button text
		const updateBulkDeleteBtn = () => {
			const countSpan = bulkDeleteBtn.querySelector('.bulk-count');
			if (countSpan) {
				countSpan.textContent = selectedForBulk.size > 0 ? ` Delete (${selectedForBulk.size})` : ' Delete';
			}
			bulkDeleteBtn.toggleClass('disabled', selectedForBulk.size === 0);
		};

		// View toggle buttons (Phase 5)
		const viewToggle = controlsBar.createDiv({ cls: 'notes-view-toggle' });
		let currentView: 'list' | 'cards' | 'timeline' | 'heatmap' = 'list';

		const viewButtons = [
			{ id: 'list', icon: '≡', title: 'List view' },
			{ id: 'cards', icon: '▦', title: 'Card view' },
			{ id: 'timeline', icon: '⏱', title: 'Timeline view' },
			{ id: 'heatmap', icon: '▥', title: 'Heatmap view' }
		];

		const viewBtnElements: HTMLButtonElement[] = [];
		viewButtons.forEach(view => {
			const btn = viewToggle.createEl('button', {
				text: view.icon,
				cls: `view-toggle-btn ${view.id === 'list' ? 'active' : ''}`,
				attr: { title: view.title, 'aria-label': view.title, role: 'button', 'data-view': view.id }
			});
			viewBtnElements.push(btn);
			btn.addEventListener('click', () => {
				currentView = view.id as typeof currentView;
				viewBtnElements.forEach(b => b.removeClass('active'));
				btn.addClass('active');
				renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
			});
		});

		// ===== TWO-COLUMN LAYOUT =====
		const mainArea = mainContainer.createDiv({ cls: 'notes-main-area' });

		// Left panel: Notes list
		const listPanel = mainArea.createDiv({ cls: 'notes-list-panel' });
		const notesListContainer = listPanel.createDiv({ cls: 'notes-list-container' });

		// Right panel: Preview (collapsible)
		const previewPanel = mainArea.createDiv({ cls: 'notes-preview-panel' });
		previewPanel.createEl('div', {
			text: 'Select a note to preview',
			cls: 'notes-preview-placeholder'
		});

		// Random button handler (needs notesListContainer)
		randomBtn.addEventListener('click', async () => {
			if (this.plugin.noteReferences.length === 0) {
				showToast('No notes to choose from');
				return;
			}
			const randomIndex = Math.floor(Math.random() * this.plugin.noteReferences.length);
			const randomNote = this.plugin.noteReferences[randomIndex];
			const referenceText = `${randomNote.book} ${randomNote.chapter}:${randomNote.verse}${randomNote.endVerse && randomNote.endVerse !== randomNote.verse ? `-${randomNote.endVerse}` : ''}`;
			notesListContainer.querySelectorAll('.notes-list-item, .notes-card-item').forEach(el => el.removeClass('selected'));
			await renderPreview(randomNote, referenceText);
			showToast(`Random note: ${referenceText}`);
		});

		// ===== RENDER NOTES LIST =====
		const renderNotes = async (searchFilter: string = '', typeFilter: string = 'all', bookFilterVal: string = 'all', sortBy: string = 'book', searchContent: boolean = false) => {
			notesListContainer.empty();

			if (this.plugin.noteReferences.length === 0) {
				const emptyState = notesListContainer.createDiv({ cls: 'notes-empty-state' });
				emptyState.createEl('div', { text: '📝', cls: 'empty-state-icon' });
				emptyState.createEl('div', { text: 'No notes yet', cls: 'empty-state-title' });
				emptyState.createEl('div', { text: 'Right-click a verse to create your first note!', cls: 'empty-state-text' });
				return;
			}

			// Show loading if searching content
			if (searchContent && searchFilter.length > 0) {
				notesListContainer.createDiv({ text: 'Searching content...', cls: 'notes-searching' });
			}

			// Filter notes (with content search support)
			let filteredNotes: NoteReference[] = [];

			for (const note of this.plugin.noteReferences) {
				const matchesType = typeFilter === 'all' || note.noteType === typeFilter;
				const matchesBook = bookFilterVal === 'all' || note.book === bookFilterVal;

				if (!matchesType || !matchesBook) continue;

				// Basic search (reference and path)
				let matchesSearch = searchFilter === '' ||
					note.book.toLowerCase().includes(searchFilter.toLowerCase()) ||
					note.notePath.toLowerCase().includes(searchFilter.toLowerCase());

				// Content search if enabled
				if (!matchesSearch && searchContent && searchFilter.length > 0) {
					// Check cache first
					let content = noteContentCache.get(note.notePath);
					if (!content) {
						const file = this.app.vault.getAbstractFileByPath(note.notePath);
						if (file instanceof TFile) {
							try {
								content = await this.app.vault.read(file);
								noteContentCache.set(note.notePath, content);
							} catch (e) {
								content = '';
							}
						}
					}
					if (content && content.toLowerCase().includes(searchFilter.toLowerCase())) {
						matchesSearch = true;
					}
				}

				if (matchesSearch) {
					filteredNotes.push(note);
				}
			}

			// Clear loading message
			notesListContainer.empty();

			// Sort notes (pinned always first, then by selected sort order)
			const books = this.plugin.getBooksArray(this.currentVersion);

			// Helper to compare notes by sort order
			const compareNotes = (a: NoteReference, b: NoteReference): number => {
				if (sortBy === 'book') {
					const bookDiff = books.indexOf(a.book) - books.indexOf(b.book);
					if (bookDiff !== 0) return bookDiff;
					if (a.chapter !== b.chapter) return a.chapter - b.chapter;
					return a.verse - b.verse;
				} else if (sortBy === 'alpha') {
					return a.book.localeCompare(b.book);
				}
				return 0; // 'recent' handled separately
			};

			if (sortBy === 'recent') {
				// Sort by file modification time (most recent first), pinned first
				const notesWithMtime: Array<{ note: NoteReference; mtime: number }> = [];
				for (const note of filteredNotes) {
					const file = this.app.vault.getAbstractFileByPath(note.notePath);
					const mtime = file instanceof TFile ? file.stat.mtime : 0;
					notesWithMtime.push({ note, mtime });
				}
				notesWithMtime.sort((a, b) => {
					// Pinned notes first
					if (a.note.isPinned && !b.note.isPinned) return -1;
					if (!a.note.isPinned && b.note.isPinned) return 1;
					// Then by mtime
					return b.mtime - a.mtime;
				});
				filteredNotes = notesWithMtime.map(n => n.note);
			} else {
				// Sort with pinned first
				filteredNotes.sort((a, b) => {
					// Pinned notes first
					if (a.isPinned && !b.isPinned) return -1;
					if (!a.isPinned && b.isPinned) return 1;
					// Then by selected order
					return compareNotes(a, b);
				});
			}

			// Count pinned notes
			const pinnedCount = filteredNotes.filter(n => n.isPinned).length;

			// Count header
			const countHeader = notesListContainer.createDiv({ cls: 'notes-count-header' });
			countHeader.textContent = `${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''}${pinnedCount > 0 ? ` (${pinnedCount} pinned)` : ''}`;

			// Helper function for note click handling
			const handleNoteClick = async (note: NoteReference, referenceText: string, element: HTMLElement) => {
				notesListContainer.querySelectorAll('.notes-list-item, .notes-card-item, .timeline-note-item').forEach(el => {
					el.removeClass('selected');
				});
				element.addClass('selected');
				selectedNote = note;
				await renderPreview(note, referenceText);
			};

			// Helper to toggle pin status
			const togglePin = async (note: NoteReference) => {
				note.isPinned = !note.isPinned;
				await this.plugin.saveHighlightsAndNotes();
				renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
				showToast(note.isPinned ? 'Note pinned' : 'Note unpinned');
			};

			// Store filtered notes for bulk operations
			const currentFilteredNotes = filteredNotes;

			// ===== VIEW MODES =====
			if (currentView === 'list') {
				// LIST VIEW (default)
				filteredNotes.forEach(note => {
					const noteItem = notesListContainer.createDiv({
						cls: `notes-list-item ${note.isPinned ? 'pinned' : ''} ${bulkMode ? 'bulk-mode' : ''} ${selectedForBulk.has(note.notePath) ? 'bulk-selected' : ''}`
					});
					const noteType = NOTE_TYPES.find(t => t.type === note.noteType);
					noteItem.style.borderLeftColor = noteType?.color || '#666';

					let referenceText = `${note.book} ${note.chapter}:${note.verse}`;
					if (note.endVerse && note.endVerse !== note.verse) referenceText += `-${note.endVerse}`;

					const itemContent = noteItem.createDiv({ cls: 'note-item-content' });

					// Bulk checkbox (only in bulk mode)
					if (bulkMode) {
						const checkbox = itemContent.createEl('input', {
							type: 'checkbox',
							cls: 'bulk-checkbox'
						}) as HTMLInputElement;
						checkbox.checked = selectedForBulk.has(note.notePath);
						checkbox.addEventListener('click', (e) => {
							e.stopPropagation();
							if (checkbox.checked) {
								selectedForBulk.add(note.notePath);
								noteItem.addClass('bulk-selected');
							} else {
								selectedForBulk.delete(note.notePath);
								noteItem.removeClass('bulk-selected');
							}
							updateBulkDeleteBtn();
						});
					}

					// Pin button (only when not in bulk mode)
					if (!bulkMode) {
						const pinBtn = itemContent.createEl('button', {
							cls: `note-pin-btn ${note.isPinned ? 'pinned' : ''}`,
							attr: { title: note.isPinned ? 'Unpin note' : 'Pin note' }
						});
						const pinIcon = pinBtn.createSpan({ cls: 'pin-icon' });
						setIcon(pinIcon, 'pin');
						pinBtn.addEventListener('click', (e) => {
							e.stopPropagation();
							togglePin(note);
						});
					}

					itemContent.createEl('span', { text: noteType?.icon || '📝', cls: 'note-icon' });
					itemContent.createEl('span', { text: referenceText, cls: 'note-ref' });
					itemContent.createEl('span', { text: noteType?.label || 'Note', cls: 'note-type' });

					noteItem.addEventListener('click', () => {
						if (bulkMode) {
							// Toggle selection in bulk mode
							const checkbox = noteItem.querySelector('.bulk-checkbox') as HTMLInputElement;
							if (checkbox) {
								checkbox.checked = !checkbox.checked;
								if (checkbox.checked) {
									selectedForBulk.add(note.notePath);
									noteItem.addClass('bulk-selected');
								} else {
									selectedForBulk.delete(note.notePath);
									noteItem.removeClass('bulk-selected');
								}
								updateBulkDeleteBtn();
							}
						} else {
							handleNoteClick(note, referenceText, noteItem);
						}
					});
					noteItem.addEventListener('dblclick', async () => {
						if (!bulkMode) {
							const file = this.app.vault.getAbstractFileByPath(note.notePath);
							if (file instanceof TFile) {
								await this.app.workspace.getLeaf('split').openFile(file);
								this.navigateToReference(referenceText);
							}
						}
					});
				});

				// Bulk select all handler
				bulkSelectAllBtn.onclick = () => {
					currentFilteredNotes.forEach(n => selectedForBulk.add(n.notePath));
					renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
					updateBulkDeleteBtn();
				};

				// Bulk deselect handler
				bulkDeselectBtn.onclick = () => {
					selectedForBulk.clear();
					renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
					updateBulkDeleteBtn();
				};

				// Bulk delete handler
				bulkDeleteBtn.onclick = async () => {
					if (selectedForBulk.size === 0) return;

					const count = selectedForBulk.size;
					const confirmed = await showConfirmModal(
						this.app,
						'Delete notes?',
						`Delete ${count} note${count > 1 ? 's' : ''}? This will also delete the note files.`,
						{ confirmText: 'Delete', isDestructive: true }
					);
					if (!confirmed) return;

					for (const notePath of selectedForBulk) {
						// Delete file
						const file = this.app.vault.getAbstractFileByPath(notePath);
						if (file) {
							await this.app.vault.delete(file);
						}
						// Remove reference
						const idx = this.plugin.noteReferences.findIndex(n => n.notePath === notePath);
						if (idx !== -1) {
							this.plugin.noteReferences.splice(idx, 1);
						}
					}

					await this.plugin.saveHighlightsAndNotes();
					selectedForBulk.clear();
					bulkMode = false;
					bulkToggleBtn.removeClass('active');
					bulkActionsDiv.addClass('hidden');
					renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
					showToast(`Deleted ${count} note${count > 1 ? 's' : ''}`);
				};

			} else if (currentView === 'cards') {
				// CARD VIEW - larger cards with content preview
				const cardsContainer = notesListContainer.createDiv({ cls: 'notes-cards-grid' });

				for (const note of filteredNotes) {
					const noteType = NOTE_TYPES.find(t => t.type === note.noteType);
					let referenceText = `${note.book} ${note.chapter}:${note.verse}`;
					if (note.endVerse && note.endVerse !== note.verse) referenceText += `-${note.endVerse}`;

					const card = cardsContainer.createDiv({ cls: `notes-card-item ${note.isPinned ? 'pinned' : ''}` });
					card.style.borderTopColor = noteType?.color || '#666';

					// Card header with pin button
					const cardHeader = card.createDiv({ cls: 'card-header' });

					// Pin button
					const pinBtn = cardHeader.createEl('button', {
						cls: `note-pin-btn ${note.isPinned ? 'pinned' : ''}`,
						attr: { title: note.isPinned ? 'Unpin note' : 'Pin note' }
					});
					const pinIcon = pinBtn.createSpan({ cls: 'pin-icon' });
					setIcon(pinIcon, 'pin');
					pinBtn.addEventListener('click', (e) => {
						e.stopPropagation();
						togglePin(note);
					});

					cardHeader.createEl('span', { text: noteType?.icon || '📝', cls: 'card-icon' });
					cardHeader.createEl('span', { text: referenceText, cls: 'card-ref' });

					// Card content preview
					const cardContent = card.createDiv({ cls: 'card-content-preview' });
					try {
						const file = this.app.vault.getAbstractFileByPath(note.notePath);
						if (file instanceof TFile) {
							const content = await this.app.vault.read(file);
							// Strip YAML frontmatter (handles CRLF, whitespace, and ensures full removal)
							// Regex: optional whitespace, opening ---, any content, closing ---, trailing newlines
							let textContent = content.replace(/^\s*---[\s\S]*?---\r?\n*/m, '').trim();
							// Also strip any heading lines that might be at the start (e.g., "# Genesis 1:1")
							textContent = textContent.replace(/^#+\s+.*\r?\n*/m, '').trim();
							// Get preview text (skip empty lines at start)
							textContent = textContent.replace(/^[\r\n]+/, '');
							cardContent.textContent = textContent.slice(0, 120) + (textContent.length > 120 ? '...' : '');
							if (!textContent) {
								cardContent.textContent = 'Empty note';
							}
						}
					} catch (e) {
						cardContent.textContent = 'Unable to load preview';
					}

					// Card footer
					const cardFooter = card.createDiv({ cls: 'card-footer' });
					cardFooter.createEl('span', { text: noteType?.label || 'Note', cls: 'card-type' });

					card.addEventListener('click', () => handleNoteClick(note, referenceText, card));
					card.addEventListener('dblclick', async () => {
						const file = this.app.vault.getAbstractFileByPath(note.notePath);
						if (file instanceof TFile) {
							await this.app.workspace.getLeaf('split').openFile(file);
							this.navigateToReference(referenceText);
						}
					});
				}

			} else if (currentView === 'timeline') {
				// TIMELINE VIEW - chronological with dates
				const timelineContainer = notesListContainer.createDiv({ cls: 'notes-timeline' });

				// Get notes with modification times and sort by date
				const notesWithDates: Array<{ note: NoteReference; mtime: number; date: string }> = [];
				for (const note of filteredNotes) {
					const file = this.app.vault.getAbstractFileByPath(note.notePath);
					if (file instanceof TFile) {
						const mtime = file.stat.mtime;
						const date = new Date(mtime).toLocaleDateString('en-US', {
							year: 'numeric', month: 'short', day: 'numeric'
						});
						notesWithDates.push({ note, mtime, date });
					}
				}
				notesWithDates.sort((a, b) => b.mtime - a.mtime);

				// Group by date
				const notesByDate = new Map<string, typeof notesWithDates>();
				notesWithDates.forEach(item => {
					if (!notesByDate.has(item.date)) notesByDate.set(item.date, []);
					notesByDate.get(item.date)!.push(item);
				});

				// Render timeline
				notesByDate.forEach((notes, date) => {
					const dateGroup = timelineContainer.createDiv({ cls: 'timeline-date-group' });
					dateGroup.createEl('div', { text: date, cls: 'timeline-date-label' });

					const dateNotes = dateGroup.createDiv({ cls: 'timeline-notes' });
					notes.forEach(({ note }) => {
						const noteType = NOTE_TYPES.find(t => t.type === note.noteType);
						let referenceText = `${note.book} ${note.chapter}:${note.verse}`;
						if (note.endVerse && note.endVerse !== note.verse) referenceText += `-${note.endVerse}`;

						const timelineItem = dateNotes.createDiv({ cls: 'timeline-note-item' });
						timelineItem.createEl('span', { text: noteType?.icon || '📝', cls: 'timeline-icon' });
						timelineItem.createEl('span', { text: referenceText, cls: 'timeline-ref' });

						timelineItem.addEventListener('click', () => handleNoteClick(note, referenceText, timelineItem));
					});
				});

			} else if (currentView === 'heatmap') {
				// HEATMAP VIEW - 66-book grid showing note density
				const heatmapContainer = notesListContainer.createDiv({ cls: 'notes-heatmap' });
				heatmapContainer.createEl('div', { text: 'Note density by book', cls: 'heatmap-title' });

				// Count notes per book
				const noteCountByBook = new Map<string, number>();
				filteredNotes.forEach(note => {
					noteCountByBook.set(note.book, (noteCountByBook.get(note.book) || 0) + 1);
				});
				const maxCount = Math.max(...noteCountByBook.values(), 1);

				// Bible books in order
				const allBibleBooks = this.plugin.getBooksArray(this.currentVersion);

				// OT and NT sections
				const otBooks = allBibleBooks.slice(0, 39);
				const ntBooks = allBibleBooks.slice(39);

				const renderBookGrid = (books: string[], label: string) => {
					const section = heatmapContainer.createDiv({ cls: 'heatmap-section' });
					section.createEl('div', { text: label, cls: 'heatmap-section-label' });
					const grid = section.createDiv({ cls: 'heatmap-grid' });

					books.forEach(book => {
						const count = noteCountByBook.get(book) || 0;
						const intensity = count > 0 ? Math.min(1, count / maxCount) : 0;
						const cell = grid.createDiv({ cls: 'heatmap-cell' });

						// Color intensity based on count
						if (count > 0) {
							const alpha = 0.2 + (intensity * 0.8);
							cell.style.backgroundColor = `rgba(59, 130, 246, ${alpha})`;
							cell.style.color = intensity > 0.5 ? '#fff' : 'var(--text-normal)';
						}

						// Abbreviate book name
						const abbrev = book.length > 5 ? book.slice(0, 3) : book;
						cell.textContent = abbrev;
						cell.setAttribute('title', `${book}: ${count} note${count !== 1 ? 's' : ''}`);

						// Click to filter by this book
						cell.addEventListener('click', () => {
							bookFilter.value = book;
							currentView = 'list';
							viewBtnElements.forEach(b => b.removeClass('active'));
							viewBtnElements[0].addClass('active');
							renderNotes(searchInput.value, 'all', book, sortSelect.value, contentSearchCheckbox.checked);
						});
					});
				};

				renderBookGrid(otBooks, 'Old Testament');
				renderBookGrid(ntBooks, 'New Testament');
			}

			if (filteredNotes.length === 0) {
				const emptyState = notesListContainer.createDiv({ cls: 'notes-empty-state' });
				emptyState.createEl('div', { text: '🔍', cls: 'empty-state-icon' });
				emptyState.createEl('div', { text: 'No matches found', cls: 'empty-state-title' });
				emptyState.createEl('div', { text: 'Try adjusting your search or filters', cls: 'empty-state-text' });
			}
		};

		// ===== RENDER PREVIEW PANEL =====
		const renderPreview = async (note: NoteReference, referenceText: string) => {
			previewPanel.empty();

			const file = this.app.vault.getAbstractFileByPath(note.notePath);
			if (!(file instanceof TFile)) {
				previewPanel.createEl('div', { text: 'Note file not found', cls: 'notes-preview-error' });
				return;
			}

			// Preview header
			const previewHeader = previewPanel.createDiv({ cls: 'notes-preview-header' });
			previewHeader.createEl('h3', { text: referenceText, cls: 'preview-title' });

			// Metadata
			const metadata = previewHeader.createDiv({ cls: 'preview-metadata' });
			const noteType = NOTE_TYPES.find(t => t.type === note.noteType);
			metadata.createEl('span', { text: `${noteType?.icon || '📝'} ${noteType?.label || 'Note'}`, cls: 'preview-type' });

			const fileContent = await this.app.vault.read(file);
			const wordCount = fileContent.split(/\s+/).filter(w => w.length > 0).length;
			metadata.createEl('span', { text: `${wordCount} words`, cls: 'preview-words' });

			const modDate = new Date(file.stat.mtime).toLocaleDateString();
			metadata.createEl('span', { text: `Modified: ${modDate}`, cls: 'preview-date' });

			// Action buttons
			const previewActions = previewHeader.createDiv({ cls: 'preview-actions' });

			const goToVerseBtn = previewActions.createEl('button', {
				text: '📖 Go to Verse',
				cls: 'preview-action-btn'
			});
			goToVerseBtn.addEventListener('click', async () => {
				// Open note in new tab and navigate to verse
				await this.app.workspace.getLeaf('split').openFile(file);
				this.navigateToReference(referenceText);
			});

			const openEditorBtn = previewActions.createEl('button', {
				text: '✏️ Edit',
				cls: 'preview-action-btn'
			});
			openEditorBtn.addEventListener('click', async () => {
				await this.app.workspace.getLeaf('split').openFile(file);
			});

			const deleteBtn = previewActions.createEl('button', {
				text: '🗑️ Delete',
				cls: 'preview-action-btn danger'
			});
			deleteBtn.addEventListener('click', async () => {
				const confirmed = await showConfirmModal(
					this.app,
					'Delete note?',
					`Delete note for ${referenceText}?`,
					{ confirmText: 'Delete', isDestructive: true }
				);
				if (confirmed) {
					await this.app.vault.delete(file);
					this.plugin.noteReferences = this.plugin.noteReferences.filter(n => n.notePath !== note.notePath);
					await this.plugin.saveHighlightsAndNotes();
					showToast('Note deleted');
					await this.render();
				}
			});

			// Preview content
			const previewContent = previewPanel.createDiv({ cls: 'notes-preview-content' });

			// Render markdown content
			try {
				await MarkdownRenderer.renderMarkdown(
					fileContent,
					previewContent,
					note.notePath,
					this
				);
			} catch (e) {
				previewContent.createEl('pre', { text: fileContent });
			}

			// Related Notes section
			const relatedNotes = this.plugin.noteReferences.filter(n =>
				n.notePath !== note.notePath && (
					(n.book === note.book && n.chapter === note.chapter) || // Same chapter
					(n.book === note.book && Math.abs(n.chapter - note.chapter) <= 1) // Adjacent chapters
				)
			).slice(0, 5);

			if (relatedNotes.length > 0) {
				const relatedSection = previewPanel.createDiv({ cls: 'notes-related-section' });
				relatedSection.createEl('h4', { text: '🔗 Related Notes', cls: 'related-title' });

				const relatedList = relatedSection.createDiv({ cls: 'related-list' });
				relatedNotes.forEach(related => {
					const relatedItem = relatedList.createDiv({ cls: 'related-item' });
					let relRef = `${related.book} ${related.chapter}:${related.verse}`;
					if (related.endVerse && related.endVerse !== related.verse) {
						relRef += `-${related.endVerse}`;
					}
					relatedItem.textContent = relRef;
					relatedItem.addEventListener('click', async () => {
						notesListContainer.querySelectorAll('.notes-list-item').forEach(el => el.removeClass('selected'));
						await renderPreview(related, relRef);
					});
				});
			}
		};

		// Initial render
		renderNotes();
		renderAnalytics(); // Load analytics on initial render

		// Event listeners for filters
		// Debounce for content search (more expensive)
		let searchTimeout: NodeJS.Timeout | null = null;
		searchInput.addEventListener('input', () => {
			if (searchTimeout) clearTimeout(searchTimeout);
			const delay = contentSearchCheckbox.checked ? 300 : 50; // Longer delay for content search
			searchTimeout = setTimeout(() => {
				renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
			}, delay);
		});
		bookFilter.addEventListener('change', () => {
			renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
		});
		sortSelect.addEventListener('change', () => {
			renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
		});
		contentSearchCheckbox.addEventListener('change', () => {
			if (searchInput.value) {
				renderNotes(searchInput.value, 'all', bookFilter.value, sortSelect.value, contentSearchCheckbox.checked);
			}
		});

		// Keyboard shortcut: "/" to focus search
		mainContainer.setAttribute('tabindex', '0');
		mainContainer.addEventListener('keydown', (e) => {
			if (e.key === '/' && document.activeElement !== searchInput) {
				e.preventDefault();
				searchInput.focus();
			}
		});
	}

	renderHighlightsBrowserMode(container: HTMLElement) {
		const books = this.plugin.getBooksArray(this.currentVersion);
		let currentView: 'list' | 'cards' | 'heatmap' | 'layers' = 'list';
		let selectedHighlight: Highlight | null = null;
		let showAnalytics = true;
		let selectedHighlightIds: Set<string> = new Set();

		// Calculate analytics
		const calculateHighlightsAnalytics = () => {
			// Filter highlights by visible layers
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
			const highlights = this.plugin.highlights.filter(h => {
				const highlightLayer = h.layer || 'personal';
				return visibleLayers.includes(highlightLayer);
			});

			const totalHighlights = highlights.length;
			const totalWordCount = highlights.reduce((sum, h) => sum + h.text.split(/\s+/).length, 0);

			// Color distribution
			const colorCounts = new Map<string, number>();
			highlights.forEach(h => {
				colorCounts.set(h.color, (colorCounts.get(h.color) || 0) + 1);
			});

			// Highlights by book
			const highlightsByBook = new Map<string, number>();
			highlights.forEach(h => {
				highlightsByBook.set(h.book, (highlightsByBook.get(h.book) || 0) + 1);
			});

			// Top chapters (hot spots)
			const chapterCounts = new Map<string, number>();
			highlights.forEach(h => {
				const key = `${h.book} ${h.chapter}`;
				chapterCounts.set(key, (chapterCounts.get(key) || 0) + 1);
			});
			const topChapters = Array.from(chapterCounts.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([chapter, count]) => ({ chapter, count }));

			// Layer distribution (across ALL highlights, not just visible)
			const layerCounts = new Map<string, number>();
			this.plugin.highlights.forEach(h => {
				const layerId = h.layer || 'personal';
				layerCounts.set(layerId, (layerCounts.get(layerId) || 0) + 1);
			});

			return { totalHighlights, totalWordCount, colorCounts, highlightsByBook, topChapters, layerCounts };
		};

		const analytics = calculateHighlightsAnalytics();

		// Main container
		const highlightsBrowser = container.createDiv({ cls: 'highlights-browser' });

		// ===== ACTIVE FILTERS TRACKER (must be declared early) =====
		let activeFilters = {
			search: '',
			color: 'all',
			layer: 'all',
			book: 'all'
		};

		// ===== ANALYTICS DASHBOARD =====
		const analyticsDashboard = highlightsBrowser.createDiv({ cls: 'highlights-analytics-dashboard' });

		const analyticsHeader = analyticsDashboard.createDiv({ cls: 'analytics-header' });
		analyticsHeader.createEl('h3', { text: '📊 Highlights Analytics' });
		const toggleAnalyticsBtn = analyticsHeader.createEl('button', { cls: 'analytics-toggle-btn' });
		setIcon(toggleAnalyticsBtn, 'chevron-down');

		const analyticsContent = analyticsDashboard.createDiv({ cls: 'analytics-content' });

		toggleAnalyticsBtn.addEventListener('click', () => {
			showAnalytics = !showAnalytics;
			toggleAnalyticsBtn.toggleClass('collapsed', !showAnalytics);
			analyticsContent.toggleClass('collapsed', !showAnalytics);
		});

		// Stats row
		const statsRow = analyticsContent.createDiv({ cls: 'analytics-stats-row' });

		const totalCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		totalCard.createDiv({ cls: 'stat-icon', text: '🖍️' });
		totalCard.createDiv({ cls: 'stat-value', text: analytics.totalHighlights.toString() });
		totalCard.createDiv({ cls: 'stat-label', text: 'Total highlights' });

		const wordsCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		wordsCard.createDiv({ cls: 'stat-icon', text: '📝' });
		wordsCard.createDiv({ cls: 'stat-value', text: analytics.totalWordCount.toLocaleString() });
		wordsCard.createDiv({ cls: 'stat-label', text: 'Words highlighted' });

		const booksCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		booksCard.createDiv({ cls: 'stat-icon', text: '📚' });
		booksCard.createDiv({ cls: 'stat-value', text: analytics.highlightsByBook.size.toString() });
		booksCard.createDiv({ cls: 'stat-label', text: 'Books covered' });

		const colorsCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		colorsCard.createDiv({ cls: 'stat-icon', text: '🎨' });
		colorsCard.createDiv({ cls: 'stat-value', text: analytics.colorCounts.size.toString() });
		colorsCard.createDiv({ cls: 'stat-label', text: 'Colors used' });

		// Color distribution cards
		if (analytics.colorCounts.size > 0) {
			const colorSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			const colorHeader = colorSection.createDiv({ cls: 'analytics-section-header' });
			colorHeader.createEl('h4', { text: 'Color distribution' });
			colorHeader.createSpan({ text: 'Click to filter', cls: 'analytics-section-hint' });

			const colorCardsContainer = colorSection.createDiv({ cls: 'color-distribution-cards' });

			this.plugin.settings.highlightColors.forEach(colorDef => {
				const count = analytics.colorCounts.get(colorDef.color) || 0;
				if (count > 0) {
					const isActive = activeFilters.color === colorDef.color;
					const colorCard = colorCardsContainer.createDiv({
						cls: `color-card ${isActive ? 'active' : ''}`
					});
					colorCard.style.setProperty('--card-color', colorDef.color);

					const colorSwatch = colorCard.createDiv({ cls: 'color-card-swatch' });
					colorSwatch.style.backgroundColor = colorDef.color;

					const colorInfo = colorCard.createDiv({ cls: 'color-card-info' });
					colorInfo.createDiv({ cls: 'color-card-name', text: colorDef.name });
					colorInfo.createDiv({ cls: 'color-card-count', text: `${count} highlight${count !== 1 ? 's' : ''}` });

					// Click to filter by this color
					colorCard.addEventListener('click', () => {
						if (activeFilters.color === colorDef.color) {
							// If already filtered to this color, clear the filter
							activeFilters.color = 'all';
							colorSelect.value = 'all';
						} else {
							// Otherwise, filter to this color
							activeFilters.color = colorDef.color;
							colorSelect.value = colorDef.color;
						}
						renderActiveFiltersBar(activeFiltersBar);
						renderHighlightsList();
						showToast(activeFilters.color === 'all' ? 'Showing all colors' : `Filtered to ${colorDef.name}`);
					});
				}
			});
		}

		// Layer distribution section (created once, content updated dynamically)
		const layerSection = analyticsContent.createDiv({ cls: 'analytics-section layer-distribution-section' });
		const layerHeader = layerSection.createDiv({ cls: 'analytics-section-header' });
		layerHeader.createEl('h4', { text: '📁 Layer Distribution' });
		layerHeader.createSpan({ text: 'Click to filter', cls: 'analytics-section-hint' });
		const layerCardsContainer = layerSection.createDiv({ cls: 'layer-distribution-cards' });

		// Function to render/update layer distribution cards
		const renderLayerDistribution = () => {
			// Recalculate layer counts
			const layerCounts = new Map<string, number>();
			this.plugin.highlights.forEach(h => {
				const layerId = h.layer || 'personal';
				layerCounts.set(layerId, (layerCounts.get(layerId) || 0) + 1);
			});

			layerCardsContainer.empty();

			// Hide section if no highlights
			if (layerCounts.size === 0 || this.plugin.highlights.length === 0) {
				layerSection.style.display = 'none';
				return;
			}
			layerSection.style.display = '';

			this.plugin.settings.annotationLayers.forEach(layer => {
				const count = layerCounts.get(layer.id) || 0;
				if (count > 0) {
					const isActive = activeFilters.layer === layer.id;
					const layerCard = layerCardsContainer.createDiv({
						cls: `layer-card ${isActive ? 'active' : ''}`
					});
					layerCard.style.setProperty('--layer-color', layer.color);

					const layerBadge = layerCard.createDiv({ cls: 'layer-card-badge' });
					layerBadge.style.backgroundColor = layer.color;

					const layerInfo = layerCard.createDiv({ cls: 'layer-card-info' });
					layerInfo.createDiv({ cls: 'layer-card-name', text: layer.name });
					layerInfo.createDiv({ cls: 'layer-card-count', text: `${count} highlight${count !== 1 ? 's' : ''}` });

					// Click to filter by this layer
					layerCard.addEventListener('click', () => {
						if (activeFilters.layer === layer.id) {
							// If already filtered to this layer, clear the filter
							activeFilters.layer = 'all';
							layerSelect.value = 'all';
						} else {
							// Otherwise, filter to this layer
							activeFilters.layer = layer.id;
							layerSelect.value = layer.id;
						}
						renderActiveFiltersBar(activeFiltersBar);
						renderHighlightsList();
						showToast(activeFilters.layer === 'all' ? 'Showing all layers' : `Filtered to ${layer.name} layer`);
					});
				}
			});
		};

		// Initial render
		renderLayerDistribution();

		// Hot spots (top chapters)
		if (analytics.topChapters.length > 0) {
			const hotSpotsSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			hotSpotsSection.createEl('h4', { text: '🔥 Most Highlighted Chapters' });
			const hotSpotsList = hotSpotsSection.createDiv({ cls: 'hot-spots-list' });

			analytics.topChapters.forEach((spot, index) => {
				const spotItem = hotSpotsList.createDiv({ cls: 'hot-spot-item' });
				spotItem.createSpan({ text: `${index + 1}. ${spot.chapter}`, cls: 'hot-spot-chapter' });
				spotItem.createSpan({ text: `${spot.count} highlights`, cls: 'hot-spot-count' });
			});
		}

		// Function to render active filter chips
		const renderActiveFiltersBar = (container: HTMLElement) => {
			container.empty();

			const hasActiveFilters = activeFilters.search !== '' ||
				activeFilters.color !== 'all' ||
				activeFilters.layer !== 'all' ||
				activeFilters.book !== 'all';

			if (!hasActiveFilters) {
				container.style.display = 'none';
				return;
			}

			container.style.display = 'flex';

			// Search chip
			if (activeFilters.search !== '') {
				const chip = container.createDiv({ cls: 'filter-chip' });
				chip.createSpan({ text: `Search: "${activeFilters.search}"`, cls: 'filter-chip-label' });
				const dismissBtn = chip.createSpan({ text: '✕', cls: 'filter-chip-dismiss' });
				dismissBtn.addEventListener('click', () => {
					activeFilters.search = '';
					searchInput.value = '';
					renderActiveFiltersBar(activeFiltersBar);
					renderHighlightsList();
				});
			}

			// Color chip
			if (activeFilters.color !== 'all') {
				const colorName = this.plugin.settings.highlightColors.find(c => c.color === activeFilters.color)?.name || activeFilters.color;
				const chip = container.createDiv({ cls: 'filter-chip' });
				const colorDot = chip.createSpan({ cls: 'filter-chip-color-dot' });
				colorDot.style.backgroundColor = activeFilters.color;
				chip.createSpan({ text: colorName, cls: 'filter-chip-label' });
				const dismissBtn = chip.createSpan({ text: '✕', cls: 'filter-chip-dismiss' });
				dismissBtn.addEventListener('click', () => {
					activeFilters.color = 'all';
					colorSelect.value = 'all';
					renderActiveFiltersBar(activeFiltersBar);
					renderHighlightsList();
				});
			}

			// Layer chip
			if (activeFilters.layer !== 'all') {
				const layerName = this.plugin.settings.annotationLayers.find(l => l.id === activeFilters.layer)?.name || activeFilters.layer;
				const layerColor = this.plugin.settings.annotationLayers.find(l => l.id === activeFilters.layer)?.color;
				const chip = container.createDiv({ cls: 'filter-chip' });
				const layerDot = chip.createSpan({ cls: 'filter-chip-color-dot' });
				if (layerColor) layerDot.style.backgroundColor = layerColor;
				chip.createSpan({ text: `Layer: ${layerName}`, cls: 'filter-chip-label' });
				const dismissBtn = chip.createSpan({ text: '✕', cls: 'filter-chip-dismiss' });
				dismissBtn.addEventListener('click', () => {
					activeFilters.layer = 'all';
					layerSelect.value = 'all';
					renderActiveFiltersBar(activeFiltersBar);
					renderHighlightsList();
				});
			}

			// Book chip
			if (activeFilters.book !== 'all') {
				const chip = container.createDiv({ cls: 'filter-chip' });
				chip.createSpan({ text: `Book: ${activeFilters.book}`, cls: 'filter-chip-label' });
				const dismissBtn = chip.createSpan({ text: '✕', cls: 'filter-chip-dismiss' });
				dismissBtn.addEventListener('click', () => {
					activeFilters.book = 'all';
					bookSelect.value = 'all';
					renderActiveFiltersBar(activeFiltersBar);
					renderHighlightsList();
				});
			}

			// Clear all button
			const clearAllBtn = container.createEl('button', { text: 'Clear all', cls: 'filter-chip-clear-all' });
			clearAllBtn.addEventListener('click', () => {
				activeFilters = { search: '', color: 'all', layer: 'all', book: 'all' };
				searchInput.value = '';
				colorSelect.value = 'all';
				layerSelect.value = 'all';
				bookSelect.value = 'all';
				renderActiveFiltersBar(activeFiltersBar);
				renderHighlightsList();
			});
		};

		// ===== PRIMARY CONTROLS BAR =====
		const primaryControlsBar = highlightsBrowser.createDiv({ cls: 'highlights-primary-controls' });

		// Search
		const searchInput = primaryControlsBar.createEl('input', {
			type: 'text',
			placeholder: 'Search highlights...',
			cls: 'highlights-search-input'
		});

		searchInput.addEventListener('input', () => {
			activeFilters.search = searchInput.value.toLowerCase();
			renderActiveFiltersBar(activeFiltersBar);
			renderHighlightsList();
		});

		// View toggle buttons
		const viewToggle = primaryControlsBar.createDiv({ cls: 'highlights-view-toggle' });
		const viewButtons = [
			{ id: 'list', icon: '≡', label: 'List', title: 'List view' },
			{ id: 'cards', icon: '▦', label: 'Cards', title: 'Card view' },
			{ id: 'heatmap', icon: '▥', label: 'Heatmap', title: 'Heatmap view' },
			{ id: 'layers', icon: '📁', label: 'Layers', title: 'Group by Layer' }
		];

		viewButtons.forEach(btn => {
			const viewBtn = viewToggle.createEl('button', {
				cls: `view-toggle-btn ${currentView === btn.id ? 'active' : ''}`,
				attr: { title: btn.title, 'aria-label': btn.title, role: 'button' }
			});
			viewBtn.createSpan({ text: btn.icon, cls: 'view-toggle-icon' });
			viewBtn.createSpan({ text: btn.label, cls: 'view-toggle-label' });
			viewBtn.addEventListener('click', () => {
				currentView = btn.id as 'list' | 'cards' | 'heatmap' | 'layers';
				viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
				viewBtn.addClass('active');
				renderHighlightsList();
			});
		});

		// ===== ACTIVE FILTERS BAR =====
		const activeFiltersBar = highlightsBrowser.createDiv({ cls: 'highlights-active-filters' });
		activeFiltersBar.style.display = 'none'; // Hidden by default

		// ===== SECONDARY CONTROLS BAR =====
		const secondaryControlsBar = highlightsBrowser.createDiv({ cls: 'highlights-secondary-controls' });

		// Color filter
		const colorSelect = secondaryControlsBar.createEl('select', { cls: 'highlights-color-select' });
		colorSelect.createEl('option', { value: 'all', text: 'All colors' });
		this.plugin.settings.highlightColors.forEach(color => {
			const option = colorSelect.createEl('option', { value: color.color, text: color.name });
			option.style.color = color.color;
		});

		colorSelect.addEventListener('change', () => {
			activeFilters.color = colorSelect.value;
			renderActiveFiltersBar(activeFiltersBar);
			renderHighlightsList();
		});

		// Layer filter
		const layerSelect = secondaryControlsBar.createEl('select', { cls: 'highlights-layer-select' });
		layerSelect.createEl('option', { value: 'all', text: 'All layers' });
		this.plugin.settings.annotationLayers.forEach(layer => {
			const option = layerSelect.createEl('option', { value: layer.id, text: layer.name });
			option.style.color = layer.color;
		});

		layerSelect.addEventListener('change', () => {
			activeFilters.layer = layerSelect.value;
			renderActiveFiltersBar(activeFiltersBar);
			renderHighlightsList();
		});

		// Book filter (only show books with highlights in visible layers)
		const bookSelect = secondaryControlsBar.createEl('select', { cls: 'highlights-book-select' });
		bookSelect.createEl('option', { value: 'all', text: 'All books' });
		const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
		const visibleHighlights = this.plugin.highlights.filter(h => {
			const highlightLayer = h.layer || 'personal';
			return visibleLayers.includes(highlightLayer);
		});
		const booksWithHighlights = [...new Set(visibleHighlights.map(h => h.book))];
		booksWithHighlights.sort((a, b) => books.indexOf(a) - books.indexOf(b));
		booksWithHighlights.forEach(book => {
			bookSelect.createEl('option', { value: book, text: book });
		});

		bookSelect.addEventListener('change', () => {
			activeFilters.book = bookSelect.value;
			renderActiveFiltersBar(activeFiltersBar);
			renderHighlightsList();
		});

		// Random highlight button
		const randomBtn = secondaryControlsBar.createEl('button', {
			text: '🎲 Random',
			cls: 'highlights-random-btn',
			attr: { title: 'Show random highlight' }
		});

		randomBtn.addEventListener('click', () => {
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
			const visibleHighlights = this.plugin.highlights.filter(h => {
				const highlightLayer = h.layer || 'personal';
				return visibleLayers.includes(highlightLayer);
			});

			if (visibleHighlights.length === 0) {
				showToast('No highlights in visible layers');
				return;
			}

			const randomHighlight = visibleHighlights[Math.floor(Math.random() * visibleHighlights.length)];
			selectedHighlight = randomHighlight;
			renderPreview(randomHighlight);

			// Scroll to the highlight in the list
			const highlightElements = listPanel.querySelectorAll('.highlight-item');
			highlightElements.forEach((el: HTMLElement) => {
				if (el.dataset.highlightId === randomHighlight.id) {
					el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}
			});
		});

		// Action buttons
		const actionsDiv = secondaryControlsBar.createDiv({ cls: 'highlights-actions' });

		const exportBtn = actionsDiv.createEl('button', { text: '📤 Export', cls: 'highlights-action-btn' });
		exportBtn.addEventListener('click', async () => await this.exportHighlights());

		const importBtn = actionsDiv.createEl('button', { text: '📥 Import', cls: 'highlights-action-btn' });
		importBtn.addEventListener('click', async () => await this.importHighlights());

		// Bulk action controls
		const bulkActionsDiv = secondaryControlsBar.createDiv({ cls: 'highlights-bulk-actions' });
		bulkActionsDiv.style.display = 'none'; // Hidden by default

		const selectionCount = bulkActionsDiv.createSpan({ cls: 'bulk-selection-count', text: '0 selected' });

		const selectAllBtn = bulkActionsDiv.createEl('button', { text: 'Select all', cls: 'bulk-action-btn' });
		selectAllBtn.addEventListener('click', () => {
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
			const visibleHighlights = this.plugin.highlights.filter(h => {
				const highlightLayer = h.layer || 'personal';
				return visibleLayers.includes(highlightLayer);
			});
			selectedHighlightIds = new Set(visibleHighlights.map(h => h.id));
			renderHighlightsList();
			selectionCount.textContent = `${selectedHighlightIds.size} selected`;
			showToast(`Selected ${selectedHighlightIds.size} highlights`);
		});

		const deselectAllBtn = bulkActionsDiv.createEl('button', { text: 'Deselect all', cls: 'bulk-action-btn' });
		deselectAllBtn.addEventListener('click', () => {
			selectedHighlightIds.clear();
			renderHighlightsList();
			selectionCount.textContent = '0 selected';
			bulkActionsDiv.style.display = 'none';
		});

		const bulkMoveToLayerBtn = bulkActionsDiv.createEl('button', { text: '📁 Move to Layer', cls: 'bulk-action-btn' });
		bulkMoveToLayerBtn.addEventListener('click', (e) => {
			if (selectedHighlightIds.size === 0) return;

			const menu = new Menu();
			this.plugin.settings.annotationLayers.forEach(layer => {
				menu.addItem((item) => {
					item.setTitle(layer.name);
					item.setIcon('folder');
					item.onClick(async () => {
						// Move all selected highlights to this layer
						const selectedHighlights = this.plugin.highlights.filter(h => selectedHighlightIds.has(h.id));
						for (const highlight of selectedHighlights) {
							highlight.layer = layer.id;
						}
						await this.plugin.saveHighlightsAndNotes();

						selectedHighlightIds.clear();
						selectionCount.textContent = '0 selected';
						bulkActionsDiv.style.display = 'none';
						renderHighlightsList();
						showToast(`Moved ${selectedHighlights.length} highlight${selectedHighlights.length !== 1 ? 's' : ''} to ${layer.name} layer`);
					});
				});
			});

			menu.showAtMouseEvent(e);
		});

		const bulkDeleteBtn = bulkActionsDiv.createEl('button', { text: '🗑️ Delete Selected', cls: 'bulk-action-btn bulk-danger' });
		bulkDeleteBtn.addEventListener('click', async () => {
			if (selectedHighlightIds.size === 0) return;

			const confirmed = await this.showBulkDeleteHighlightsConfirmation(selectedHighlightIds.size);
			if (confirmed) {
				await Promise.all(Array.from(selectedHighlightIds).map(id => this.plugin.removeHighlight(id)));
				selectedHighlightIds.clear();
				selectionCount.textContent = '0 selected';
				bulkActionsDiv.style.display = 'none';
				renderHighlightsList();
				showToast(`Deleted highlights`);
			}
		});

		const clearAllBtn = actionsDiv.createEl('button', { text: '🗑️ Clear All', cls: 'highlights-action-btn danger' });
		clearAllBtn.addEventListener('click', async () => {
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;
			const visibleHighlights = this.plugin.highlights.filter(h => {
				const highlightLayer = h.layer || 'personal';
				return visibleLayers.includes(highlightLayer);
			});

			if (visibleHighlights.length === 0) {
				showToast('No visible highlights to clear');
				return;
			}

			const confirmed = await this.showClearAllHighlightsConfirmation(visibleHighlights.length);
			if (confirmed) {
				// Delete only highlights from visible layers
				this.plugin.highlights = this.plugin.highlights.filter(h => {
					const highlightLayer = h.layer || 'personal';
					return !visibleLayers.includes(highlightLayer);
				});
				await this.plugin.saveHighlightsAndNotes();
				await this.render();
				showToast(`Cleared ${visibleHighlights.length} highlights from visible layers`);
			}
		});

		// ===== MAIN CONTENT AREA (Two columns) =====
		const mainArea = highlightsBrowser.createDiv({ cls: 'highlights-main-area' });
		const listPanel = mainArea.createDiv({ cls: 'highlights-list-panel' });
		const previewPanel = mainArea.createDiv({ cls: 'highlights-preview-panel' });

		// Preview panel content
		const renderPreview = (highlight: Highlight | null) => {
			previewPanel.empty();

			if (!highlight) {
				previewPanel.createDiv({ cls: 'preview-placeholder', text: 'Select a highlight to preview' });
				return;
			}

			const previewHeader = previewPanel.createDiv({ cls: 'preview-header' });
			let referenceText = `${highlight.book} ${highlight.chapter}:${highlight.verse}`;
			if (highlight.endVerse && highlight.endVerse !== highlight.verse) {
				referenceText += `-${highlight.endVerse}`;
			}
			previewHeader.createEl('h3', { text: referenceText });

			// Inline color picker (clickable color indicator)
			const colorPickerContainer = previewHeader.createDiv({ cls: 'preview-color-picker' });
			const colorIndicator = colorPickerContainer.createDiv({ cls: 'preview-color-indicator' });
			colorIndicator.style.backgroundColor = highlight.color;
			const currentColorName = this.plugin.settings.highlightColors.find(c => c.color === highlight.color)?.name || 'Custom';
			const colorLabel = colorPickerContainer.createSpan({ text: currentColorName, cls: 'preview-color-label' });
			colorPickerContainer.setAttribute('title', 'Click to change color');

			// Make entire container clickable
			colorPickerContainer.addEventListener('click', (e) => {
				const menu = new Menu();
				this.plugin.settings.highlightColors.forEach(color => {
					menu.addItem((item) => {
						item.setTitle(color.name);
						item.setIcon('palette');
						if (color.color === highlight.color) {
							item.setChecked(true);
						}
						item.onClick(async () => {
							const highlightToUpdate = this.plugin.highlights.find(h => h.id === highlight.id);
							if (highlightToUpdate) {
								highlightToUpdate.color = color.color;
								await this.plugin.saveHighlightsAndNotes();
								renderHighlightsList();
								renderPreview(highlightToUpdate);
								showToast(`Changed to ${color.name}`);
							}
						});
					});
				});
				menu.showAtMouseEvent(e);
			});

			// Layer selector
			const layerSelectorDiv = previewPanel.createDiv({ cls: 'preview-layer-selector' });
			layerSelectorDiv.createEl('label', { text: 'Layer: ', cls: 'preview-layer-label' });
			const layerSelect = layerSelectorDiv.createEl('select', { cls: 'preview-layer-dropdown' });
			const currentLayerId = highlight.layer || 'personal';
			this.plugin.settings.annotationLayers.forEach(layer => {
				const option = layerSelect.createEl('option', { value: layer.id, text: layer.name });
				if (layer.id === currentLayerId) option.selected = true;
			});

			layerSelect.addEventListener('change', async (e) => {
				const newLayerId = (e.target as HTMLSelectElement).value;
				const newLayer = this.plugin.settings.annotationLayers.find(l => l.id === newLayerId);

				// Update highlight layer
				highlight.layer = newLayerId;
				await this.plugin.saveHighlightsAndNotes();

				showToast(`Moved to ${newLayer?.name || 'Unknown'} layer`);

				// Re-render the list to update the badge
				renderHighlightsList();
			});

			// Highlighted text
			const highlightedTextDiv = previewPanel.createDiv({ cls: 'preview-highlighted-text' });
			highlightedTextDiv.style.backgroundColor = highlight.color;
			highlightedTextDiv.textContent = highlight.text;

			// Full verse context
			const contextDiv = previewPanel.createDiv({ cls: 'preview-context' });
			contextDiv.createEl('h4', { text: 'Full verse' });
			const verseText = this.plugin.getVerseText(this.currentVersion, highlight.book, highlight.chapter, highlight.verse);
			if (verseText) {
				contextDiv.createDiv({ cls: 'preview-verse-text', text: verseText });
			}

			// Related highlights section
			const relatedHighlights = this.plugin.highlights.filter(h =>
				h.id !== highlight.id &&
				h.book === highlight.book &&
				h.chapter === highlight.chapter
			);

			if (relatedHighlights.length > 0) {
				const relatedSection = previewPanel.createDiv({ cls: 'preview-related-section' });
				const relatedHeader = relatedSection.createDiv({ cls: 'preview-related-header' });
				relatedHeader.createEl('h4', { text: 'Related highlights' });
				relatedHeader.createSpan({ text: `${relatedHighlights.length} in this chapter`, cls: 'preview-related-count' });

				const relatedList = relatedSection.createDiv({ cls: 'preview-related-list' });
				relatedHighlights.slice(0, 5).forEach(related => {
					const relatedItem = relatedList.createDiv({ cls: 'preview-related-item' });
					const relatedDot = relatedItem.createDiv({ cls: 'preview-related-dot' });
					relatedDot.style.backgroundColor = related.color;

					let relatedRef = `${related.book} ${related.chapter}:${related.verse}`;
					if (related.endVerse && related.endVerse !== related.verse) {
						relatedRef += `-${related.endVerse}`;
					}
					relatedItem.createSpan({ text: relatedRef, cls: 'preview-related-ref' });

					const relatedText = relatedItem.createDiv({ cls: 'preview-related-text' });
					relatedText.textContent = related.text.length > 50 ? related.text.substring(0, 50) + '...' : related.text;

					relatedItem.addEventListener('click', () => {
						selectedHighlight = related;
						renderPreview(related);

						// Scroll to the related highlight in the list
						const highlightElements = listPanel.querySelectorAll('.highlight-item, .highlight-list-item');
						highlightElements.forEach((el: HTMLElement) => {
							if (el.dataset.highlightId === related.id) {
								el.scrollIntoView({ behavior: 'smooth', block: 'center' });
							}
						});
					});
				});

				if (relatedHighlights.length > 5) {
					const moreText = relatedList.createDiv({
						cls: 'preview-related-more',
						text: `+${relatedHighlights.length - 5} more`
					});
				}
			}

			// Action buttons
			const actionsDiv = previewPanel.createDiv({ cls: 'preview-actions' });

			const goToVerseBtn = actionsDiv.createEl('button', { text: '📖 Go to Verse', cls: 'preview-action-btn primary' });
			goToVerseBtn.addEventListener('click', () => {
				this.currentBook = highlight.book;
				this.currentChapter = highlight.chapter;
				this.viewMode = ViewMode.CHAPTER;
				void this.render();
				showToast(`Navigated to ${referenceText}`);
			});

			const deleteBtn = actionsDiv.createEl('button', { text: '🗑️ Delete', cls: 'preview-action-btn danger' });
			deleteBtn.addEventListener('click', async () => {
				const confirmed = await this.showDeleteHighlightConfirmation(referenceText);
				if (confirmed) {
					await this.plugin.removeHighlight(highlight.id);
					selectedHighlight = null;
					renderHighlightsList();
					renderPreview(null);
					showToast('Highlight deleted');
				}
			});

			// Keyboard hints
			const keyboardHints = previewPanel.createDiv({ cls: 'preview-keyboard-hints' });
			const searchHint = keyboardHints.createSpan({ cls: 'keyboard-hint' });
			searchHint.createEl('kbd', { text: '/' });
			searchHint.appendText(' Search');
			const escHint = keyboardHints.createSpan({ cls: 'keyboard-hint' });
			escHint.createEl('kbd', { text: 'Esc' });
			escHint.appendText(' Clear selection');
		};

		// Render highlights list based on view mode
		const renderHighlightsList = () => {
			// Update layer distribution counts in analytics dashboard
			renderLayerDistribution();

			listPanel.empty();

			const searchFilter = searchInput.value.toLowerCase();
			const colorFilter = colorSelect.value;
			const layerFilter = layerSelect.value;
			const bookFilter = bookSelect.value;
			const visibleLayers = this.plugin.settings.visibleAnnotationLayers;

			let filteredHighlights = this.plugin.highlights.filter(highlight => {
				// Filter by visible layers (highlights without layer default to 'personal')
				const highlightLayer = highlight.layer || 'personal';
				if (!visibleLayers.includes(highlightLayer)) return false;

				const matchesSearch = searchFilter === '' ||
					highlight.book.toLowerCase().includes(searchFilter) ||
					highlight.text.toLowerCase().includes(searchFilter);
				const matchesColor = colorFilter === 'all' || highlight.color === colorFilter;
				const matchesLayer = layerFilter === 'all' || highlightLayer === layerFilter;
				const matchesBook = bookFilter === 'all' || highlight.book === bookFilter;
				return matchesSearch && matchesColor && matchesLayer && matchesBook;
			});

			if (filteredHighlights.length === 0) {
				const emptyState = listPanel.createDiv({ cls: 'highlights-no-data' });
				// Check if there are any highlights in visible layers
				const visibleHighlightsExist = this.plugin.highlights.some(h => {
					const highlightLayer = h.layer || 'personal';
					return visibleLayers.includes(highlightLayer);
				});

				if (!visibleHighlightsExist) {
					emptyState.createEl('div', { text: '🖍️', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No highlights in visible layers', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Create highlights or show other annotation layers', cls: 'empty-state-text' });
				} else {
					emptyState.createEl('div', { text: '🔍', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No matches found', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Try adjusting your search or filters', cls: 'empty-state-text' });
				}
				return;
			}

			if (currentView === 'list') {
				renderListView(filteredHighlights);
			} else if (currentView === 'cards') {
				renderCardsView(filteredHighlights);
			} else if (currentView === 'heatmap') {
				renderHeatmapView(filteredHighlights);
			} else if (currentView === 'layers') {
				renderLayersView(filteredHighlights);
			}
		};

		// List View
		const renderListView = (highlights: Highlight[]) => {
			const highlightsByBook = new Map<string, Highlight[]>();
			highlights.forEach(h => {
				if (!highlightsByBook.has(h.book)) highlightsByBook.set(h.book, []);
				highlightsByBook.get(h.book)?.push(h);
			});

			const sortedBooks = Array.from(highlightsByBook.keys()).sort((a, b) => books.indexOf(a) - books.indexOf(b));

			sortedBooks.forEach(book => {
				const bookSection = listPanel.createDiv({ cls: 'highlights-book-section' });
				const bookHighlights = highlightsByBook.get(book) || [];

				bookSection.createEl('h3', { text: `${book} (${bookHighlights.length})`, cls: 'highlights-book-title' });

				bookHighlights.sort((a, b) => a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse);

				const highlightsList = bookSection.createDiv({ cls: 'highlights-list' });
				bookHighlights.forEach(highlight => {
					const highlightItem = highlightsList.createDiv({
						cls: `highlight-list-item ${selectedHighlight?.id === highlight.id ? 'selected' : ''}`
					});
					highlightItem.style.borderLeft = `4px solid ${highlight.color}`;

					// Add checkbox for bulk selection
					const checkbox = highlightItem.createEl('input', { type: 'checkbox', cls: 'highlight-checkbox' });
					checkbox.checked = selectedHighlightIds.has(highlight.id);
					checkbox.addEventListener('change', (e) => {
						e.stopPropagation();
						if (checkbox.checked) {
							selectedHighlightIds.add(highlight.id);
						} else {
							selectedHighlightIds.delete(highlight.id);
						}
						selectionCount.textContent = `${selectedHighlightIds.size} selected`;
						bulkActionsDiv.style.display = selectedHighlightIds.size > 0 ? 'flex' : 'none';
					});

					let refText = `${highlight.chapter}:${highlight.verse}`;
					if (highlight.endVerse && highlight.endVerse !== highlight.verse) refText += `-${highlight.endVerse}`;

					highlightItem.createSpan({ text: refText, cls: 'highlight-ref' });

					// Add layer badge and dropdown
					const layerId = highlight.layer || 'personal';
					const layer = this.plugin.settings.annotationLayers.find(l => l.id === layerId);
					if (layer) {
						const layerBadge = highlightItem.createSpan({ cls: 'layer-badge' });
						layerBadge.style.backgroundColor = layer.color;
						layerBadge.setAttribute('aria-label', layer.name);
						layerBadge.setAttribute('title', `Layer: ${layer.name}`);

						// Layer dropdown for changing layer
						const layerDropdown = highlightItem.createEl('select', { cls: 'highlight-layer-dropdown' });
						this.plugin.settings.annotationLayers.forEach(l => {
							const option = layerDropdown.createEl('option', { value: l.id, text: l.name });
							if (l.id === layerId) option.selected = true;
						});

						layerDropdown.addEventListener('change', async (e) => {
							e.stopPropagation(); // Prevent triggering list item click
							const newLayerId = (e.target as HTMLSelectElement).value;
							const newLayer = this.plugin.settings.annotationLayers.find(l => l.id === newLayerId);

							// Update highlight layer
							highlight.layer = newLayerId;
							await this.plugin.saveHighlightsAndNotes();

							// Update badge color
							layerBadge.style.backgroundColor = newLayer?.color || '#888888';
							layerBadge.setAttribute('aria-label', newLayer?.name || 'Unknown');
							layerBadge.setAttribute('title', `Layer: ${newLayer?.name || 'Unknown'}`);

							showToast(`Moved to ${newLayer?.name || 'Unknown'} layer`);
						});
					}

					const textPreview = highlightItem.createDiv({ cls: 'highlight-text-snippet' });
					textPreview.textContent = highlight.text.length > 60 ? highlight.text.substring(0, 60) + '...' : highlight.text;

					highlightItem.addEventListener('click', () => {
						selectedHighlight = highlight;
						listPanel.querySelectorAll('.highlight-list-item').forEach(el => el.removeClass('selected'));
						highlightItem.addClass('selected');
						renderPreview(highlight);
					});
				});
			});
		};

		// Cards View
		const renderCardsView = (highlights: Highlight[]) => {
			const cardsGrid = listPanel.createDiv({ cls: 'highlights-cards-grid' });

			highlights.forEach(highlight => {
				const card = cardsGrid.createDiv({
					cls: `highlight-card ${selectedHighlight?.id === highlight.id ? 'selected' : ''}`
				});
				card.style.borderTop = `4px solid ${highlight.color}`;

				let refText = `${highlight.book} ${highlight.chapter}:${highlight.verse}`;
				if (highlight.endVerse && highlight.endVerse !== highlight.verse) refText += `-${highlight.endVerse}`;

				const refDiv = card.createDiv({ cls: 'highlight-card-ref', text: refText });

				// Add layer badge
				const layerId = highlight.layer || 'personal';
				const layer = this.plugin.settings.annotationLayers.find(l => l.id === layerId);
				if (layer) {
					const layerBadge = refDiv.createSpan({ cls: 'layer-badge' });
					layerBadge.style.backgroundColor = layer.color;
					layerBadge.setAttribute('aria-label', layer.name);
					layerBadge.setAttribute('title', `Layer: ${layer.name}`);
				}

				const textDiv = card.createDiv({ cls: 'highlight-card-text' });
				textDiv.style.backgroundColor = highlight.color + '30'; // 30% opacity
				textDiv.textContent = highlight.text.length > 100 ? highlight.text.substring(0, 100) + '...' : highlight.text;

				card.addEventListener('click', () => {
					selectedHighlight = highlight;
					cardsGrid.querySelectorAll('.highlight-card').forEach(el => el.removeClass('selected'));
					card.addClass('selected');
					renderPreview(highlight);
				});
			});
		};

		// Heatmap View
		const renderHeatmapView = (highlights: Highlight[]) => {
			const heatmapContainer = listPanel.createDiv({ cls: 'highlights-heatmap-container' });
			heatmapContainer.createEl('h3', { text: 'Highlights by Book' });

			const highlightsByBook = new Map<string, number>();
			highlights.forEach(h => {
				highlightsByBook.set(h.book, (highlightsByBook.get(h.book) || 0) + 1);
			});

			const maxCount = Math.max(...highlightsByBook.values(), 1);

			const heatmapGrid = heatmapContainer.createDiv({ cls: 'highlights-heatmap-grid' });

			// All 66 books
			const allBooks = [
				'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
				'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
				'1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
				'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
				'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
				'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
				'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
				'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
				'Matthew', 'Mark', 'Luke', 'John', 'Acts',
				'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
				'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
				'2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
				'1 Peter', '2 Peter', '1 John', '2 John', '3 John',
				'Jude', 'Revelation'
			];

			allBooks.forEach(book => {
				const count = highlightsByBook.get(book) || 0;
				const cell = heatmapGrid.createDiv({ cls: 'heatmap-cell' });

				const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0;
				cell.style.backgroundColor = count > 0 ? `rgba(234, 179, 8, ${intensity})` : 'var(--background-secondary)';

				const abbrev = book.length > 6 ? book.substring(0, 5) + '.' : book;
				cell.createDiv({ cls: 'heatmap-cell-label', text: abbrev });
				if (count > 0) {
					cell.createDiv({ cls: 'heatmap-cell-count', text: count.toString() });
				}

				cell.setAttribute('title', `${book}: ${count} highlight${count !== 1 ? 's' : ''}`);

				cell.addEventListener('click', () => {
					if (count > 0) {
						bookSelect.value = book;
						currentView = 'list';
						viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
						viewToggle.querySelector('.view-toggle-btn')?.addClass('active');
						renderHighlightsList();
					}
				});
			});
		};

		// Layers View (Group by Layer)
		const renderLayersView = (highlights: Highlight[]) => {
			// Group highlights by layer
			const highlightsByLayer = new Map<string, Highlight[]>();
			highlights.forEach(h => {
				const layerId = h.layer || 'personal';
				if (!highlightsByLayer.has(layerId)) highlightsByLayer.set(layerId, []);
				highlightsByLayer.get(layerId)?.push(h);
			});

			// Render each layer section
			this.plugin.settings.annotationLayers.forEach(layer => {
				const layerHighlights = highlightsByLayer.get(layer.id) || [];
				if (layerHighlights.length === 0) return; // Skip empty layers

				const layerSection = listPanel.createDiv({ cls: 'layer-section' });

				// Layer header
				const layerHeader = layerSection.createDiv({ cls: 'layer-section-header' });
				layerHeader.style.borderLeft = `4px solid ${layer.color}`;

				const layerBadge = layerHeader.createDiv({ cls: 'layer-section-badge' });
				layerBadge.style.backgroundColor = layer.color;

				const layerInfo = layerHeader.createDiv({ cls: 'layer-section-info' });
				layerInfo.createEl('h3', { text: layer.name, cls: 'layer-section-title' });
				layerInfo.createDiv({ text: `${layerHighlights.length} highlight${layerHighlights.length !== 1 ? 's' : ''}`, cls: 'layer-section-count' });

				// Sort highlights by book order
				layerHighlights.sort((a, b) => {
					const bookCompare = books.indexOf(a.book) - books.indexOf(b.book);
					if (bookCompare !== 0) return bookCompare;
					if (a.chapter !== b.chapter) return a.chapter - b.chapter;
					return a.verse - b.verse;
				});

				// Render highlights list
				const highlightsList = layerSection.createDiv({ cls: 'layer-highlights-list' });
				layerHighlights.forEach(highlight => {
					const highlightItem = highlightsList.createDiv({
						cls: `highlight-list-item ${selectedHighlight?.id === highlight.id ? 'selected' : ''}`
					});
					highlightItem.style.borderLeft = `4px solid ${highlight.color}`;

					let refText = `${highlight.book} ${highlight.chapter}:${highlight.verse}`;
					if (highlight.endVerse && highlight.endVerse !== highlight.verse) refText += `-${highlight.endVerse}`;

					highlightItem.createSpan({ text: refText, cls: 'highlight-ref' });

					const textPreview = highlightItem.createDiv({ cls: 'highlight-text-snippet' });
					textPreview.textContent = highlight.text.length > 60 ? highlight.text.substring(0, 60) + '...' : highlight.text;

					highlightItem.addEventListener('click', () => {
						selectedHighlight = highlight;
						listPanel.querySelectorAll('.highlight-list-item').forEach(el => el.removeClass('selected'));
						highlightItem.addClass('selected');
						renderPreview(highlight);
					});
				});
			});
		};

		// Event listeners are already set up inline when creating elements above
		// No need for duplicate listeners here

		// Keyboard shortcut: "/" to focus search
		highlightsBrowser.setAttribute('tabindex', '0');
		highlightsBrowser.addEventListener('keydown', (e) => {
			if (e.key === '/' && document.activeElement !== searchInput) {
				e.preventDefault();
				searchInput.focus();
			}
		});

		// Initial render
		renderHighlightsList();
		renderPreview(null);
	}

	/**
	 * Show confirmation dialog for deleting a single highlight
	 */
	async showDeleteHighlightConfirmation(reference: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('⚠️ Delete Highlight');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `Delete highlight for ${reference}?`,
				cls: 'warning-text'
			});
			content.createEl('p', {
				text: 'This action is PERMANENT and CANNOT be undone.',
				cls: 'warning-text-strong'
			});

			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl('button', {
				text: 'Delete highlight',
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	/**
	 * Show confirmation dialog for deleting multiple highlights
	 */
	async showBulkDeleteHighlightsConfirmation(count: number): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('⚠️ Delete Multiple Highlights');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `Delete ${count} highlight${count !== 1 ? 's' : ''}?`,
				cls: 'warning-text'
			});
			content.createEl('p', {
				text: 'This action is PERMANENT and CANNOT be undone.',
				cls: 'warning-text-strong'
			});

			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl('button', {
				text: `Delete ${count} Highlights`,
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	/**
	 * Show confirmation dialog for clearing all highlights
	 */
	async showClearAllHighlightsConfirmation(count: number): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('⚠️ Clear All Visible Highlights');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `You are about to delete ${count} highlights from visible layers.`,
				cls: 'warning-text'
			});
			content.createEl('p', {
				text: 'This action is PERMANENT and CANNOT be undone.',
				cls: 'warning-text-strong'
			});
			content.createEl('p', {
				text: 'Consider exporting your highlights first as a backup.',
				cls: 'warning-hint'
			});

			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl('button', {
				text: 'Delete all highlights',
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	renderBookmarksBrowserMode(container: HTMLElement) {
		const books = this.plugin.getBooksArray(this.currentVersion);
		let currentView: 'list' | 'timeline' | 'heatmap' = 'list';
		let selectedBookmark: Bookmark | null = null;
		let showAnalytics = true;

		// Calculate analytics
		const calculateBookmarksAnalytics = () => {
			const bookmarks = this.plugin.bookmarks;
			const totalBookmarks = bookmarks.length;

			// By level
			const levelCounts = { book: 0, chapter: 0, verse: 0 };
			bookmarks.forEach(b => {
				if (b.bookmarkLevel in levelCounts) {
					levelCounts[b.bookmarkLevel as keyof typeof levelCounts]++;
				}
			});

			// By book
			const bookmarksByBook = new Map<string, number>();
			bookmarks.forEach(b => {
				bookmarksByBook.set(b.book, (bookmarksByBook.get(b.book) || 0) + 1);
			});

			// Recent activity (last 7 days)
			const now = Date.now();
			const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
			const recentBookmarks = bookmarks.filter(b => b.createdAt > sevenDaysAgo);

			// Most recent bookmark (for continue reading)
			const mostRecent = bookmarks.length > 0
				? bookmarks.reduce((latest, b) => b.createdAt > latest.createdAt ? b : latest)
				: null;

			// Reading coverage (how many books have at least one bookmark)
			const coveragePercent = Math.round((bookmarksByBook.size / 66) * 100);

			return { totalBookmarks, levelCounts, bookmarksByBook, recentBookmarks, mostRecent, coveragePercent };
		};

		const analytics = calculateBookmarksAnalytics();

		// Main container
		const bookmarksBrowser = container.createDiv({ cls: 'bookmarks-browser' });

		// ===== ANALYTICS DASHBOARD =====
		const analyticsDashboard = bookmarksBrowser.createDiv({ cls: 'bookmarks-analytics-dashboard' });

		const analyticsHeader = analyticsDashboard.createDiv({ cls: 'analytics-header' });
		analyticsHeader.createEl('h3', { text: '📊 Bookmarks Analytics' });
		const toggleAnalyticsBtn = analyticsHeader.createEl('button', { cls: 'analytics-toggle-btn' });
		setIcon(toggleAnalyticsBtn, 'chevron-down');

		const analyticsContent = analyticsDashboard.createDiv({ cls: 'analytics-content' });

		toggleAnalyticsBtn.addEventListener('click', () => {
			showAnalytics = !showAnalytics;
			toggleAnalyticsBtn.toggleClass('collapsed', !showAnalytics);
			analyticsContent.toggleClass('collapsed', !showAnalytics);
		});

		// Stats row
		const statsRow = analyticsContent.createDiv({ cls: 'analytics-stats-row' });

		const totalCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		totalCard.createDiv({ cls: 'stat-icon', text: '🔖' });
		totalCard.createDiv({ cls: 'stat-value', text: analytics.totalBookmarks.toString() });
		totalCard.createDiv({ cls: 'stat-label', text: 'Total bookmarks' });

		const booksCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		booksCard.createDiv({ cls: 'stat-icon', text: '📚' });
		booksCard.createDiv({ cls: 'stat-value', text: analytics.bookmarksByBook.size.toString() });
		booksCard.createDiv({ cls: 'stat-label', text: 'Books marked' });

		const coverageCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		coverageCard.createDiv({ cls: 'stat-icon', text: '📊' });
		coverageCard.createDiv({ cls: 'stat-value', text: `${analytics.coveragePercent}%` });
		coverageCard.createDiv({ cls: 'stat-label', text: 'Bible Coverage' });

		const recentCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		recentCard.createDiv({ cls: 'stat-icon', text: '📅' });
		recentCard.createDiv({ cls: 'stat-value', text: analytics.recentBookmarks.length.toString() });
		recentCard.createDiv({ cls: 'stat-label', text: 'Last 7 Days' });

		// Level distribution
		if (analytics.totalBookmarks > 0) {
			const levelSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			levelSection.createEl('h4', { text: 'Bookmark levels' });
			const levelBar = levelSection.createDiv({ cls: 'level-distribution-bar' });

			const maxLevelCount = Math.max(...Object.values(analytics.levelCounts), 1);
			const levelLabels = { book: '📚 Books', chapter: '📖 Chapters', verse: '📝 Verses' };

			Object.entries(analytics.levelCounts).forEach(([level, count]) => {
				if (count > 0) {
					const levelItem = levelBar.createDiv({ cls: 'level-bar-item' });
					const bar = levelItem.createDiv({ cls: 'level-bar' });
					bar.style.width = `${(count / maxLevelCount) * 100}%`;
					bar.style.backgroundColor = level === 'book' ? '#3b82f6' : level === 'chapter' ? '#8b5cf6' : '#10b981';
					levelItem.createDiv({ cls: 'level-bar-label', text: `${levelLabels[level as keyof typeof levelLabels]}: ${count}` });
				}
			});
		}

		// Continue Reading (most recent)
		if (analytics.mostRecent) {
			const continueSection = analyticsContent.createDiv({ cls: 'analytics-section continue-reading' });
			continueSection.createEl('h4', { text: '📍 Continue Reading' });

			let refText = analytics.mostRecent.book;
			if (analytics.mostRecent.chapter) {
				refText += ` ${analytics.mostRecent.chapter}`;
				if (analytics.mostRecent.verse) refText += `:${analytics.mostRecent.verse}`;
			}

			const continueBtn = continueSection.createEl('button', {
				text: `➡️ ${refText}`,
				cls: 'continue-reading-btn'
			});
			continueBtn.addEventListener('click', () => {
				this.currentBook = analytics.mostRecent!.book;
				this.currentChapter = analytics.mostRecent!.chapter || 1;
				this.viewMode = ViewMode.CHAPTER;
				void this.render();
				showToast(`Continuing from ${refText}`);
			});
		}

		// ===== CONTROLS BAR =====
		const controlsBar = bookmarksBrowser.createDiv({ cls: 'bookmarks-controls-bar' });

		// Search
		const searchInput = controlsBar.createEl('input', {
			type: 'text',
			placeholder: 'Search bookmarks...',
			cls: 'bookmarks-search-input'
		});

		// Level filter
		const levelSelect = controlsBar.createEl('select', { cls: 'bookmarks-level-select' });
		levelSelect.createEl('option', { value: 'all', text: 'All levels' });
		levelSelect.createEl('option', { value: 'book', text: 'Books' });
		levelSelect.createEl('option', { value: 'chapter', text: 'Chapters' });
		levelSelect.createEl('option', { value: 'verse', text: 'Verses' });

		// Book filter
		const bookSelect = controlsBar.createEl('select', { cls: 'bookmarks-book-select' });
		bookSelect.createEl('option', { value: 'all', text: 'All books' });
		const booksWithBookmarks = [...new Set(this.plugin.bookmarks.map(b => b.book))];
		booksWithBookmarks.sort((a, b) => books.indexOf(a) - books.indexOf(b));
		booksWithBookmarks.forEach(book => {
			bookSelect.createEl('option', { value: book, text: book });
		});

		// View toggle buttons
		const viewToggle = controlsBar.createDiv({ cls: 'bookmarks-view-toggle' });
		const viewButtons = [
			{ id: 'list', icon: '≡', title: 'List view' },
			{ id: 'timeline', icon: '⏱', title: 'Timeline view' },
			{ id: 'heatmap', icon: '▥', title: 'Heatmap view' }
		];

		viewButtons.forEach(btn => {
			const viewBtn = viewToggle.createEl('button', {
				text: btn.icon,
				cls: `view-toggle-btn ${currentView === btn.id ? 'active' : ''}`,
				attr: { title: btn.title, 'aria-label': btn.title, role: 'button' }
			});
			viewBtn.addEventListener('click', () => {
				currentView = btn.id as 'list' | 'timeline' | 'heatmap';
				viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
				viewBtn.addClass('active');
				renderBookmarksList();
			});
		});

		// Random bookmark button
		const randomBtn = controlsBar.createEl('button', {
			text: '🎲 Random',
			cls: 'bookmarks-random-btn',
			attr: { title: 'Jump to random bookmark' }
		});

		// Action buttons
		const actionsDiv = controlsBar.createDiv({ cls: 'bookmarks-actions' });

		const exportBtn = actionsDiv.createEl('button', { text: '📤 Export', cls: 'bookmarks-action-btn' });
		exportBtn.addEventListener('click', async () => await this.exportBookmarks());

		const importBtn = actionsDiv.createEl('button', { text: '📥 Import', cls: 'bookmarks-action-btn' });
		importBtn.addEventListener('click', async () => await this.importBookmarks());

		const clearAllBtn = actionsDiv.createEl('button', { text: '🗑️ Clear All', cls: 'bookmarks-action-btn danger' });
		clearAllBtn.addEventListener('click', async () => {
			if (this.plugin.bookmarks.length === 0) {
				showToast('No bookmarks to clear');
				return;
			}
			const confirmed = await this.showClearAllBookmarksConfirmation();
			if (confirmed) {
				this.plugin.bookmarks = [];
				await this.plugin.saveHighlightsAndNotes();
				await this.render();
				showToast('All bookmarks cleared');
			}
		});

		// ===== MAIN CONTENT AREA (Two columns) =====
		const mainArea = bookmarksBrowser.createDiv({ cls: 'bookmarks-main-area' });
		const listPanel = mainArea.createDiv({ cls: 'bookmarks-list-panel' });
		const previewPanel = mainArea.createDiv({ cls: 'bookmarks-preview-panel' });

		// Preview panel content
		const renderPreview = (bookmark: Bookmark | null) => {
			previewPanel.empty();

			if (!bookmark) {
				previewPanel.createDiv({ cls: 'preview-placeholder', text: 'Select a bookmark to preview' });
				return;
			}

			const previewHeader = previewPanel.createDiv({ cls: 'preview-header' });
			let referenceText = bookmark.book;
			if (bookmark.chapter) {
				referenceText += ` ${bookmark.chapter}`;
				if (bookmark.verse) {
					referenceText += `:${bookmark.verse}`;
					if (bookmark.endVerse && bookmark.endVerse !== bookmark.verse) {
						referenceText += `-${bookmark.endVerse}`;
					}
				}
			}
			// Show bookmark name as title if set, otherwise show reference
			if (bookmark.name) {
				previewHeader.createEl('h3', { text: `🔖 ${bookmark.name}` });
				previewHeader.createDiv({ cls: 'preview-reference', text: referenceText });
			} else {
				previewHeader.createEl('h3', { text: `🔖 ${referenceText}` });
			}

			// Level badge
			const levelBadge = previewHeader.createDiv({ cls: 'preview-level-badge' });
			levelBadge.textContent = bookmark.bookmarkLevel.charAt(0).toUpperCase() + bookmark.bookmarkLevel.slice(1);
			levelBadge.style.backgroundColor = bookmark.bookmarkLevel === 'book' ? '#3b82f6' : bookmark.bookmarkLevel === 'chapter' ? '#8b5cf6' : '#10b981';

			// Note if exists
			if (bookmark.note) {
				const noteDiv = previewPanel.createDiv({ cls: 'preview-note' });
				noteDiv.createEl('h4', { text: '📝 Note' });
				noteDiv.createDiv({ cls: 'preview-note-text', text: bookmark.note });
			}

			// Verse text (if verse-level bookmark)
			if (bookmark.verse) {
				const verseText = this.plugin.getVerseText(this.currentVersion, bookmark.book, bookmark.chapter!, bookmark.verse);
				if (verseText) {
					const verseDiv = previewPanel.createDiv({ cls: 'preview-verse' });
					verseDiv.createEl('h4', { text: 'Verse text' });
					verseDiv.createDiv({ cls: 'preview-verse-text', text: verseText });
				}
			}

			// Metadata
			const metaDiv = previewPanel.createDiv({ cls: 'preview-meta' });
			const createdDate = new Date(bookmark.createdAt);
			metaDiv.createDiv({ cls: 'preview-meta-item', text: `Created: ${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString()}` });

			// Action buttons
			const actionsDiv = previewPanel.createDiv({ cls: 'preview-actions' });

			const goToBtn = actionsDiv.createEl('button', { text: '📖 Go to Location', cls: 'preview-action-btn' });
			goToBtn.addEventListener('click', () => {
				this.currentBook = bookmark.book;
				this.currentChapter = bookmark.chapter || 1;
				this.viewMode = ViewMode.CHAPTER;
				void this.render();
				showToast(`Navigated to ${referenceText}`);
			});

			// Rename button
			const renameBtn = actionsDiv.createEl('button', { text: '✏️ Rename', cls: 'preview-action-btn' });
			renameBtn.addEventListener('click', async () => {
				const currentName = bookmark.name || referenceText;
				const newName = await this.plugin.promptBookmarkName(currentName);
				if (newName !== null) {
					bookmark.name = newName || undefined;
					await this.plugin.saveSettings();
					renderBookmarksList();
					renderPreview(bookmark);
					showToast(newName ? `Renamed to "${newName}"` : 'Name cleared');
				}
			});

			const deleteBtn = actionsDiv.createEl('button', { text: '🗑️ Delete', cls: 'preview-action-btn danger' });
			deleteBtn.addEventListener('click', async () => {
				const confirmed = await this.showDeleteBookmarkConfirmation(referenceText);
				if (confirmed) {
					this.plugin.removeBookmark(bookmark.id);
					selectedBookmark = null;
					renderBookmarksList();
					renderPreview(null);
					showToast('Bookmark deleted');
				}
			});
		};

		// Render bookmarks list based on view mode
		const renderBookmarksList = () => {
			listPanel.empty();

			const searchFilter = searchInput.value.toLowerCase();
			const levelFilter = levelSelect.value;
			const bookFilter = bookSelect.value;

			let filteredBookmarks = this.plugin.bookmarks.filter(bookmark => {
				const matchesSearch = searchFilter === '' ||
					bookmark.book.toLowerCase().includes(searchFilter) ||
					(bookmark.note && bookmark.note.toLowerCase().includes(searchFilter));
				const matchesLevel = levelFilter === 'all' || bookmark.bookmarkLevel === levelFilter;
				const matchesBook = bookFilter === 'all' || bookmark.book === bookFilter;
				return matchesSearch && matchesLevel && matchesBook;
			});

			if (filteredBookmarks.length === 0) {
				const emptyState = listPanel.createDiv({ cls: 'bookmarks-no-data' });
				if (this.plugin.bookmarks.length === 0) {
					emptyState.createEl('div', { text: '🔖', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No bookmarks yet', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Use the bookmark button to save your place!', cls: 'empty-state-text' });
				} else {
					emptyState.createEl('div', { text: '🔍', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No matches found', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Try adjusting your search or filters', cls: 'empty-state-text' });
				}
				return;
			}

			if (currentView === 'list') {
				renderListView(filteredBookmarks);
			} else if (currentView === 'timeline') {
				renderTimelineView(filteredBookmarks);
			} else if (currentView === 'heatmap') {
				renderHeatmapView(filteredBookmarks);
			}
		};

		// List View (grouped by level)
		const renderListView = (bookmarks: Bookmark[]) => {
			// Sort by book order
			bookmarks.sort((a, b) => {
				const bookComp = books.indexOf(a.book) - books.indexOf(b.book);
				if (bookComp !== 0) return bookComp;
				return (a.chapter || 0) - (b.chapter || 0);
			});

			const bookmarksByLevel = {
				book: bookmarks.filter(b => b.bookmarkLevel === 'book'),
				chapter: bookmarks.filter(b => b.bookmarkLevel === 'chapter'),
				verse: bookmarks.filter(b => b.bookmarkLevel === 'verse')
			};

			const levelLabels = { book: '📚 Book Bookmarks', chapter: '📖 Chapter Bookmarks', verse: '📝 Verse Bookmarks' };

			Object.entries(bookmarksByLevel).forEach(([level, levelBookmarks]) => {
				if (levelBookmarks.length === 0) return;

				const levelSection = listPanel.createDiv({ cls: 'bookmarks-level-section' });
				levelSection.createEl('h3', { text: `${levelLabels[level as keyof typeof levelLabels]} (${levelBookmarks.length})`, cls: 'bookmarks-level-title' });

				const bookmarksList = levelSection.createDiv({ cls: 'bookmarks-list' });
				levelBookmarks.forEach(bookmark => {
					const bookmarkItem = bookmarksList.createDiv({
						cls: `bookmark-list-item ${selectedBookmark?.id === bookmark.id ? 'selected' : ''}`
					});

					let refText = bookmark.book;
					if (bookmark.chapter) {
						refText += ` ${bookmark.chapter}`;
						if (bookmark.verse) refText += `:${bookmark.verse}`;
					}

					bookmarkItem.createSpan({ text: '🔖', cls: 'bookmark-icon' });

					// Show name if set, otherwise show reference
					const displayContainer = bookmarkItem.createDiv({ cls: 'bookmark-display' });
					if (bookmark.name) {
						displayContainer.createSpan({ text: bookmark.name, cls: 'bookmark-name' });
						displayContainer.createSpan({ text: refText, cls: 'bookmark-ref-small' });
					} else {
						displayContainer.createSpan({ text: refText, cls: 'bookmark-ref' });
					}

					if (bookmark.note) {
						const noteSnippet = bookmarkItem.createDiv({ cls: 'bookmark-note-snippet' });
						noteSnippet.textContent = bookmark.note.length > 40 ? bookmark.note.substring(0, 40) + '...' : bookmark.note;
					}

					bookmarkItem.addEventListener('click', () => {
						selectedBookmark = bookmark;
						listPanel.querySelectorAll('.bookmark-list-item').forEach(el => el.removeClass('selected'));
						bookmarkItem.addClass('selected');
						renderPreview(bookmark);
					});

					// Right-click context menu
					bookmarkItem.addEventListener('contextmenu', (e) => {
						e.preventDefault();
						e.stopPropagation();

						// Remove any existing context menu
						document.querySelector('.bookmark-context-menu')?.remove();

						const menu = document.createElement('div');
						menu.className = 'bookmark-context-menu';
						menu.style.position = 'fixed';
						menu.style.left = `${e.clientX}px`;
						menu.style.top = `${e.clientY}px`;

						// Rename option
						const renameItem = menu.createDiv({ cls: 'context-menu-item' });
						renameItem.textContent = '✏️ Rename';
						renameItem.addEventListener('click', async () => {
							menu.remove();
							const currentName = bookmark.name || refText;
							const newName = await this.plugin.promptBookmarkName(currentName);
							if (newName !== null) {
								bookmark.name = newName || undefined;
								await this.plugin.saveSettings();
								renderBookmarksList();
								if (selectedBookmark?.id === bookmark.id) {
									renderPreview(bookmark);
								}
								showToast(newName ? `Renamed to "${newName}"` : 'Name cleared');
							}
						});

						// Delete option
						const deleteItem = menu.createDiv({ cls: 'context-menu-item danger' });
						deleteItem.textContent = '🗑️ Delete';
						deleteItem.addEventListener('click', async () => {
							menu.remove();
							const confirmed = await this.showDeleteBookmarkConfirmation(refText);
							if (confirmed) {
								this.plugin.removeBookmark(bookmark.id);
								if (selectedBookmark?.id === bookmark.id) {
									selectedBookmark = null;
									renderPreview(null);
								}
								renderBookmarksList();
								showToast('Bookmark deleted');
							}
						});

						document.body.appendChild(menu);

						// Close menu on click outside
						const closeMenu = (event: MouseEvent) => {
							if (!menu.contains(event.target as Node)) {
								menu.remove();
								document.removeEventListener('click', closeMenu);
							}
						};
						setTimeout(() => document.addEventListener('click', closeMenu), 0);
					});
				});
			});
		};

		// Timeline View (sorted by creation date)
		const renderTimelineView = (bookmarks: Bookmark[]) => {
			// Sort by creation date (newest first)
			bookmarks.sort((a, b) => b.createdAt - a.createdAt);

			// Group by date
			const bookmarksByDate = new Map<string, Bookmark[]>();
			bookmarks.forEach(b => {
				const date = new Date(b.createdAt).toLocaleDateString();
				if (!bookmarksByDate.has(date)) bookmarksByDate.set(date, []);
				bookmarksByDate.get(date)?.push(b);
			});

			const timeline = listPanel.createDiv({ cls: 'bookmarks-timeline' });

			bookmarksByDate.forEach((dateBookmarks, date) => {
				const dateGroup = timeline.createDiv({ cls: 'timeline-date-group' });
				dateGroup.createDiv({ cls: 'timeline-date', text: date });

				dateBookmarks.forEach(bookmark => {
					const timelineItem = dateGroup.createDiv({
						cls: `timeline-item ${selectedBookmark?.id === bookmark.id ? 'selected' : ''}`
					});

					let refText = bookmark.book;
					if (bookmark.chapter) {
						refText += ` ${bookmark.chapter}`;
						if (bookmark.verse) refText += `:${bookmark.verse}`;
					}

					const time = new Date(bookmark.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
					timelineItem.createSpan({ text: time, cls: 'timeline-time' });
					timelineItem.createSpan({ text: '🔖', cls: 'bookmark-icon' });

					// Show name if set, otherwise show reference
					if (bookmark.name) {
						const displayContainer = timelineItem.createDiv({ cls: 'bookmark-display' });
						displayContainer.createSpan({ text: bookmark.name, cls: 'bookmark-name' });
						displayContainer.createSpan({ text: refText, cls: 'bookmark-ref-small' });
					} else {
						timelineItem.createSpan({ text: refText, cls: 'bookmark-ref' });
					}

					timelineItem.addEventListener('click', () => {
						selectedBookmark = bookmark;
						timeline.querySelectorAll('.timeline-item').forEach(el => el.removeClass('selected'));
						timelineItem.addClass('selected');
						renderPreview(bookmark);
					});
				});
			});
		};

		// Heatmap View
		const renderHeatmapView = (bookmarks: Bookmark[]) => {
			const heatmapContainer = listPanel.createDiv({ cls: 'bookmarks-heatmap-container' });
			heatmapContainer.createEl('h3', { text: 'Bookmarks by Book' });

			const bookmarksByBook = new Map<string, number>();
			bookmarks.forEach(b => {
				bookmarksByBook.set(b.book, (bookmarksByBook.get(b.book) || 0) + 1);
			});

			const maxCount = Math.max(...bookmarksByBook.values(), 1);

			const heatmapGrid = heatmapContainer.createDiv({ cls: 'bookmarks-heatmap-grid' });

			const allBooks = [
				'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
				'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
				'1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
				'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
				'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
				'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
				'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
				'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
				'Matthew', 'Mark', 'Luke', 'John', 'Acts',
				'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
				'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
				'2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
				'1 Peter', '2 Peter', '1 John', '2 John', '3 John',
				'Jude', 'Revelation'
			];

			allBooks.forEach(book => {
				const count = bookmarksByBook.get(book) || 0;
				const cell = heatmapGrid.createDiv({ cls: 'heatmap-cell' });

				const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0;
				cell.style.backgroundColor = count > 0 ? `rgba(59, 130, 246, ${intensity})` : 'var(--background-secondary)';

				const abbrev = book.length > 6 ? book.substring(0, 5) + '.' : book;
				cell.createDiv({ cls: 'heatmap-cell-label', text: abbrev });
				if (count > 0) {
					cell.createDiv({ cls: 'heatmap-cell-count', text: count.toString() });
				}

				cell.setAttribute('title', `${book}: ${count} bookmark${count !== 1 ? 's' : ''}`);

				cell.addEventListener('click', () => {
					if (count > 0) {
						bookSelect.value = book;
						currentView = 'list';
						viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
						viewToggle.querySelector('.view-toggle-btn')?.addClass('active');
						renderBookmarksList();
					}
				});
			});
		};

		// Random bookmark button handler
		randomBtn.addEventListener('click', () => {
			if (this.plugin.bookmarks.length === 0) {
				showToast('No bookmarks to show');
				return;
			}
			const randomIndex = Math.floor(Math.random() * this.plugin.bookmarks.length);
			const randomBookmark = this.plugin.bookmarks[randomIndex];
			selectedBookmark = randomBookmark;
			renderPreview(randomBookmark);

			let refText = randomBookmark.book;
			if (randomBookmark.chapter) {
				refText += ` ${randomBookmark.chapter}`;
				if (randomBookmark.verse) refText += `:${randomBookmark.verse}`;
			}
			showToast(`Random bookmark: ${refText}`);
		});

		// Event listeners
		searchInput.addEventListener('input', () => renderBookmarksList());
		levelSelect.addEventListener('change', () => renderBookmarksList());
		bookSelect.addEventListener('change', () => renderBookmarksList());

		// Keyboard shortcut: "/" to focus search
		bookmarksBrowser.setAttribute('tabindex', '0');
		bookmarksBrowser.addEventListener('keydown', (e) => {
			if (e.key === '/' && document.activeElement !== searchInput) {
				e.preventDefault();
				searchInput.focus();
			}
		});

		// Initial render
		renderBookmarksList();
		renderPreview(null);
	}

	/**
	 * Render the Concordance view
	 */
	renderConcordanceMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'concordance-header' });
		const h2 = header.createEl('h2', { cls: 'concordance-title' });
		const concordanceIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(concordanceIcon, 'list');
		h2.createSpan({ text: 'Concordance' });

		if (!this.plugin.concordanceData) {
			const noConcordanceDiv = container.createDiv({ cls: 'concordance-empty-state' });
			noConcordanceDiv.createEl('p', {
				text: 'Concordance not yet built. Build a word index from your Bible text to enable word searches.',
				cls: 'concordance-info'
			});

			// Progress container (hidden initially)
			const progressContainer = noConcordanceDiv.createDiv({ cls: 'concordance-progress', attr: { style: 'display: none;' } });
			const progressText = progressContainer.createEl('p', { cls: 'concordance-progress-text' });
			const progressBarOuter = progressContainer.createDiv({ cls: 'concordance-progress-bar-outer' });
			const progressBarInner = progressBarOuter.createDiv({ cls: 'concordance-progress-bar-inner' });

			const buildBtn = noConcordanceDiv.createEl('button', {
				text: 'Build concordance',
				cls: 'mod-cta'
			});
			buildBtn.addEventListener('click', async () => {
				buildBtn.disabled = true;
				buildBtn.style.display = 'none';
				progressContainer.style.display = 'block';

				const success = await this.plugin.buildConcordanceFromBible((book, current, total) => {
					const percent = Math.round((current / total) * 100);
					progressText.textContent = `Processing ${book}... (${current}/${total} books)`;
					progressBarInner.style.width = `${percent}%`;
				});

				if (success) {
					this.render(); // Re-render to show concordance
				} else {
					buildBtn.disabled = false;
					buildBtn.style.display = 'block';
					progressContainer.style.display = 'none';
				}
			});
			return;
		}

		const stats = this.plugin.concordanceData.stats;
		header.createEl('p', {
			text: `${stats.uniqueWords.toLocaleString()} unique words from ${stats.totalVerses.toLocaleString()} verses`,
			cls: 'concordance-stats'
		});

		// Search box
		const searchDiv = container.createDiv({ cls: 'concordance-search' });
		const searchInput = searchDiv.createEl('input', {
			type: 'text',
			placeholder: 'Search for a word...',
			cls: 'concordance-search-input'
		});

		// Alphabet tabs
		const alphabetDiv = container.createDiv({ cls: 'concordance-alphabet' });
		const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
		let currentLetter = 'A';

		letters.forEach(letter => {
			const letterBtn = alphabetDiv.createEl('button', {
				text: letter,
				cls: currentLetter === letter ? 'alphabet-btn active' : 'alphabet-btn'
			});
			letterBtn.addEventListener('click', () => {
				currentLetter = letter;
				// Update active state
				alphabetDiv.querySelectorAll('.alphabet-btn').forEach(btn => {
					btn.removeClass('active');
				});
				letterBtn.addClass('active');
				searchInput.value = '';
				renderWordList(letter);
			});
		});

		// Results area
		const resultsDiv = container.createDiv({ cls: 'concordance-results' });

		// Word list column
		const wordListDiv = resultsDiv.createDiv({ cls: 'concordance-word-list' });

		// Verse references column (hidden initially)
		const versesDiv = resultsDiv.createDiv({ cls: 'concordance-verses' });
		versesDiv.style.display = 'none';

		const renderWordList = (letter: string, searchTerm: string = '') => {
			wordListDiv.empty();
			versesDiv.style.display = 'none';

			let words: string[];
			if (searchTerm) {
				// Search mode - find words containing the search term
				const term = searchTerm.toLowerCase();
				words = Object.keys(this.plugin.concordanceData!.words)
					.filter(word => word.includes(term))
					.sort();
			} else {
				// Letter mode
				words = this.plugin.getConcordanceWordsForLetter(letter);
			}

			if (words.length === 0) {
				wordListDiv.createEl('p', {
					text: searchTerm ? `No words found containing "${searchTerm}"` : `No words starting with "${letter}"`,
					cls: 'concordance-no-results'
				});
				return;
			}

			// Show count
			wordListDiv.createEl('div', {
				text: `${words.length} words`,
				cls: 'concordance-word-count'
			});

			// Word list (virtualized for performance - show first 200)
			const displayWords = words.slice(0, 200);
			displayWords.forEach(word => {
				const refs = this.plugin.concordanceData!.words[word];
				const wordItem = wordListDiv.createDiv({ cls: 'concordance-word-item' });

				const wordSpan = wordItem.createEl('span', {
					text: word,
					cls: 'concordance-word'
				});

				const countSpan = wordItem.createEl('span', {
					text: `(${refs.length})`,
					cls: 'concordance-count'
				});

				wordItem.addEventListener('click', () => {
					// Highlight selected word
					wordListDiv.querySelectorAll('.concordance-word-item').forEach(item => {
						item.removeClass('selected');
					});
					wordItem.addClass('selected');

					// Show verses
					renderVerses(word, refs);
				});
			});

			if (words.length > 200) {
				wordListDiv.createEl('p', {
					text: `Showing 200 of ${words.length} words. Use search to narrow down.`,
					cls: 'concordance-truncated'
				});
			}
		};

		const renderVerses = (word: string, refs: ConcordanceReference[]) => {
			versesDiv.empty();
			versesDiv.style.display = 'block';

			// Header
			const versesHeader = versesDiv.createDiv({ cls: 'verses-header' });
			versesHeader.createEl('h3', {
				text: `"${word}" - ${refs.length} occurrences`,
				cls: 'verses-title'
			});

			const closeBtn = versesHeader.createEl('button', {
				text: '×',
				cls: 'verses-close-btn'
			});
			closeBtn.addEventListener('click', () => {
				versesDiv.style.display = 'none';
				wordListDiv.querySelectorAll('.concordance-word-item').forEach(item => {
					item.removeClass('selected');
				});
			});

			// Group by book
			const byBook: { [book: string]: ConcordanceReference[] } = {};
			refs.forEach(ref => {
				if (!byBook[ref.book]) byBook[ref.book] = [];
				byBook[ref.book].push(ref);
			});

			// Sort books in Bible order
			const books = this.plugin.getBooksArray(this.currentVersion);
			const sortedBooks = Object.keys(byBook).sort((a, b) => {
				return books.indexOf(a) - books.indexOf(b);
			});

			const versesContent = versesDiv.createDiv({ cls: 'verses-content' });

			sortedBooks.forEach(book => {
				const bookRefs = byBook[book];
				const bookSection = versesContent.createDiv({ cls: 'verses-book-section' });

				const bookHeader = bookSection.createEl('div', {
					text: `${book} (${bookRefs.length})`,
					cls: 'verses-book-header'
				});

				const refsContainer = bookSection.createDiv({ cls: 'verses-refs' });

				bookRefs.forEach(ref => {
					const refLink = refsContainer.createEl('span', {
						text: `${ref.chapter}:${ref.verse}`,
						cls: 'verse-ref-link'
					});
					refLink.addEventListener('click', () => {
						// Navigate to verse
						this.currentBook = ref.book;
						this.currentChapter = ref.chapter;
						this.viewMode = ViewMode.CHAPTER;
						void this.render();
						showToast(`${ref.book} ${ref.chapter}:${ref.verse}`);
					});
				});
			});
		};

		// Initial render
		renderWordList('A');

		// Search handler
		let searchTimeout: NodeJS.Timeout;
		searchInput.addEventListener('input', () => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				const term = searchInput.value.trim();
				if (term.length >= 2) {
					// Remove active state from alphabet
					alphabetDiv.querySelectorAll('.alphabet-btn').forEach(btn => {
						btn.removeClass('active');
					});
					renderWordList('', term);
				} else if (term.length === 0) {
					// Restore letter view
					const activeBtn = alphabetDiv.querySelector('.alphabet-btn.active') as HTMLElement;
					if (activeBtn) {
						renderWordList(activeBtn.textContent || 'A');
					} else {
						alphabetDiv.querySelector('.alphabet-btn')?.addClass('active');
						renderWordList('A');
					}
				}
			}, 300);
		});
	}

	/**
	 * Render the Tags Browser view mode
	 */
	renderTagsBrowserMode(container: HTMLElement) {
		const books = this.plugin.getBooksArray(this.currentVersion);
		const allTags = this.plugin.getAllTagNames();
		let currentView: 'list' | 'cloud' | 'heatmap' = 'list';
		let selectedTag: string | null = null;
		let showAnalytics = true;

		// Calculate analytics
		const calculateTagsAnalytics = () => {
			const totalTags = allTags.length;
			const totalAssociations = this.plugin.verseTags.length;

			// Tag frequency (how many verses each tag appears on)
			const tagFrequency = new Map<string, number>();
			allTags.forEach(tag => {
				tagFrequency.set(tag, this.plugin.getVersesWithTag(tag).length);
			});

			// Most used tags (top 5)
			const topTags = Array.from(tagFrequency.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5)
				.map(([tag, count]) => ({ tag, count }));

			// Tags by book distribution
			const tagsByBook = new Map<string, Set<string>>();
			this.plugin.verseTags.forEach(vt => {
				if (!tagsByBook.has(vt.book)) tagsByBook.set(vt.book, new Set());
				tagsByBook.get(vt.book)?.add(vt.tag);
			});

			return { totalTags, totalAssociations, tagFrequency, topTags, tagsByBook };
		};

		const analytics = calculateTagsAnalytics();

		// Main container
		const tagsBrowser = container.createDiv({ cls: 'tags-browser' });

		// ===== ANALYTICS DASHBOARD =====
		const analyticsDashboard = tagsBrowser.createDiv({ cls: 'tags-analytics-dashboard' });

		const analyticsHeader = analyticsDashboard.createDiv({ cls: 'analytics-header' });
		analyticsHeader.createEl('h3', { text: '📊 Tags Analytics' });
		const toggleAnalyticsBtn = analyticsHeader.createEl('button', { cls: 'analytics-toggle-btn' });
		setIcon(toggleAnalyticsBtn, 'chevron-down');

		const analyticsContent = analyticsDashboard.createDiv({ cls: 'analytics-content' });

		toggleAnalyticsBtn.addEventListener('click', () => {
			showAnalytics = !showAnalytics;
			toggleAnalyticsBtn.toggleClass('collapsed', !showAnalytics);
			analyticsContent.toggleClass('collapsed', !showAnalytics);
		});

		// Stats row
		const statsRow = analyticsContent.createDiv({ cls: 'analytics-stats-row' });

		const totalCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		totalCard.createDiv({ cls: 'stat-icon', text: '🏷️' });
		totalCard.createDiv({ cls: 'stat-value', text: analytics.totalTags.toString() });
		totalCard.createDiv({ cls: 'stat-label', text: 'Total tags' });

		const associationsCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		associationsCard.createDiv({ cls: 'stat-icon', text: '🔗' });
		associationsCard.createDiv({ cls: 'stat-value', text: analytics.totalAssociations.toLocaleString() });
		associationsCard.createDiv({ cls: 'stat-label', text: 'Tag associations' });

		const booksCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		booksCard.createDiv({ cls: 'stat-icon', text: '📚' });
		booksCard.createDiv({ cls: 'stat-value', text: analytics.tagsByBook.size.toString() });
		booksCard.createDiv({ cls: 'stat-label', text: 'Books tagged' });

		const avgCard = statsRow.createDiv({ cls: 'analytics-stat-card' });
		avgCard.createDiv({ cls: 'stat-icon', text: '📈' });
		const avgPerTag = analytics.totalTags > 0 ? (analytics.totalAssociations / analytics.totalTags).toFixed(1) : '0';
		avgCard.createDiv({ cls: 'stat-value', text: avgPerTag });
		avgCard.createDiv({ cls: 'stat-label', text: 'Avg verses/tag' });

		// Tag cloud visualization (in analytics)
		if (analytics.totalTags > 0) {
			const cloudSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			cloudSection.createEl('h4', { text: 'Tag cloud' });
			const miniCloud = cloudSection.createDiv({ cls: 'tag-cloud-mini' });

			const maxFreq = Math.max(...analytics.tagFrequency.values());
			const topTagsForCloud = Array.from(analytics.tagFrequency.entries())
				.sort((a, b) => b[1] - a[1])
				.slice(0, 10);

			topTagsForCloud.forEach(([tag, count]) => {
				const fontSize = 0.8 + (count / maxFreq) * 1.2; // Range: 0.8em to 2em
				const tagSpan = miniCloud.createEl('span', {
					text: tag,
					cls: 'tag-cloud-item-mini',
					attr: { title: `${count} verses` }
				});
				tagSpan.style.fontSize = `${fontSize}em`;
			});
		}

		// Most used tags
		if (analytics.topTags.length > 0) {
			const topTagsSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			topTagsSection.createEl('h4', { text: '🔥 Most Used Tags' });
			const topTagsList = topTagsSection.createDiv({ cls: 'top-tags-list' });

			analytics.topTags.forEach((item, index) => {
				const tagItem = topTagsList.createDiv({ cls: 'top-tag-item' });
				tagItem.createSpan({ text: `${index + 1}. ${item.tag}`, cls: 'top-tag-name' });
				tagItem.createSpan({ text: `${item.count} verses`, cls: 'top-tag-count' });
			});
		}

		// Tags by book distribution (bar chart)
		if (analytics.tagsByBook.size > 0) {
			const bookDistSection = analyticsContent.createDiv({ cls: 'analytics-section' });
			bookDistSection.createEl('h4', { text: 'Tag distribution by book' });
			const barChart = bookDistSection.createDiv({ cls: 'tag-book-bars' });

			const sortedBooks = Array.from(analytics.tagsByBook.entries())
				.sort((a, b) => b[1].size - a[1].size)
				.slice(0, 10);
			const maxBookTags = sortedBooks[0]?.[1].size || 1;

			sortedBooks.forEach(([book, tags]) => {
				const barItem = barChart.createDiv({ cls: 'tag-book-bar-item' });
				const bar = barItem.createDiv({ cls: 'tag-book-bar' });
				bar.style.width = `${(tags.size / maxBookTags) * 100}%`;
				bar.style.backgroundColor = '#10b981';
				barItem.createDiv({ cls: 'tag-book-bar-label', text: `${book}: ${tags.size} tags` });
			});
		}

		// ===== CONTROLS BAR =====
		const controlsBar = tagsBrowser.createDiv({ cls: 'tags-controls-bar' });

		// Search
		const searchInput = controlsBar.createEl('input', {
			type: 'text',
			placeholder: 'Search tags...',
			cls: 'tags-search-input'
		});

		// View toggle buttons
		const viewToggle = controlsBar.createDiv({ cls: 'tags-view-toggle' });
		const viewButtons = [
			{ id: 'list', icon: '≡', title: 'List view' },
			{ id: 'cloud', icon: '☁', title: 'Cloud view' },
			{ id: 'heatmap', icon: '▥', title: 'Heatmap view' }
		];

		viewButtons.forEach(btn => {
			const viewBtn = viewToggle.createEl('button', {
				text: btn.icon,
				cls: `view-toggle-btn ${currentView === btn.id ? 'active' : ''}`,
				attr: { title: btn.title, 'aria-label': btn.title, role: 'button' }
			});
			viewBtn.addEventListener('click', () => {
				currentView = btn.id as 'list' | 'cloud' | 'heatmap';
				viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
				viewBtn.addClass('active');
				renderTagsList();
			});
		});

		// Random tagged verse button
		const randomBtn = controlsBar.createEl('button', {
			text: '🎲 Random',
			cls: 'tags-random-btn',
			attr: { title: 'Show random tagged verse' }
		});

		// Action buttons
		const actionsDiv = controlsBar.createDiv({ cls: 'tags-actions' });

		const newTagBtn = actionsDiv.createEl('button', { text: '+ New Tag', cls: 'tags-action-btn' });
		newTagBtn.addEventListener('click', () => {
			this.showCreateTagDialog();
		});

		const exportBtn = actionsDiv.createEl('button', { text: '📤 Export', cls: 'tags-action-btn' });
		exportBtn.addEventListener('click', async () => {
			if (this.plugin.verseTags.length === 0) {
				new Notice('No tags to export');
				return;
			}

			try {
				const exportData = {
					version: 1,
					exportedAt: new Date().toISOString(),
					tags: this.plugin.verseTags
				};

				const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `bible-portal-tags-${new Date().toISOString().split('T')[0]}.json`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
				new Notice(`✅ Exported ${this.plugin.verseTags.length} verse-tag associations`);
			} catch (error) {
				console.error('Error exporting tags:', error);
				new Notice('Error exporting tags');
			}
		});

		const importBtn = actionsDiv.createEl('button', { text: '📥 Import', cls: 'tags-action-btn' });
		importBtn.addEventListener('click', async () => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';
			input.onchange = async (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				try {
					const text = await file.text();
					const importData = JSON.parse(text);

					// Validate format
					if (!importData.tags || !Array.isArray(importData.tags)) {
						new Notice('Invalid tags file format');
						return;
					}

					// Validate each tag entry has required fields
					for (const tag of importData.tags) {
						if (!tag.book || !tag.chapter || !tag.verse || !tag.tag) {
							new Notice('Invalid tag entry found - missing required fields');
							return;
						}
					}

					// Merge tags (avoid duplicates)
					let added = 0;
					for (const importTag of importData.tags) {
						const exists = this.plugin.verseTags.some(
							t => t.book === importTag.book &&
								t.chapter === importTag.chapter &&
								t.verse === importTag.verse &&
								t.tag === importTag.tag
						);
						if (!exists) {
							this.plugin.verseTags.push(importTag);
							added++;
						}
					}

					await this.plugin.saveData({
						...await this.plugin.loadData(),
						verseTags: this.plugin.verseTags
					});

					new Notice(`✅ Imported ${added} new tags (${importData.tags.length - added} duplicates skipped)`);
					this.render(); // Refresh to show new tags
				} catch (error) {
					console.error('Error importing tags:', error);
					new Notice('Error importing tags file. Make sure it is valid JSON.');
				}
			};
			input.click();
		});

		// ===== MAIN CONTENT AREA (Two columns) =====
		const mainArea = tagsBrowser.createDiv({ cls: 'tags-main-area' });
		const listPanel = mainArea.createDiv({ cls: 'tags-list-panel' });
		const previewPanel = mainArea.createDiv({ cls: 'tags-preview-panel' });

		// Preview panel content
		const renderPreview = (tagName: string | null) => {
			previewPanel.empty();

			if (!tagName) {
				previewPanel.createDiv({ cls: 'preview-placeholder', text: 'Select a tag to preview' });
				return;
			}

			const verses = this.plugin.getVersesWithTag(tagName);

			const previewHeader = previewPanel.createDiv({ cls: 'preview-header' });
			previewHeader.createEl('h3', { text: `"${tagName}"` });
			previewHeader.createEl('p', { text: `${verses.length} verse${verses.length !== 1 ? 's' : ''}`, cls: 'preview-tag-count' });

			// Related tags section
			const relatedTags = findRelatedTags(tagName);
			if (relatedTags.length > 0) {
				const relatedSection = previewPanel.createDiv({ cls: 'preview-related-tags' });
				relatedSection.createEl('h4', { text: 'Related tags' });
				const relatedTagsContainer = relatedSection.createDiv({ cls: 'related-tags-container' });

				relatedTags.slice(0, 10).forEach(([relTag, sharedCount]) => {
					const tagChip = relatedTagsContainer.createEl('span', {
						text: `${relTag} (${sharedCount})`,
						cls: 'related-tag-chip',
						attr: { title: `${sharedCount} shared verse${sharedCount !== 1 ? 's' : ''}` }
					});
					tagChip.addEventListener('click', () => {
						selectedTag = relTag;
						renderTagsList();
						renderPreview(relTag);
					});
				});
			}

			// Verses list
			const versesSection = previewPanel.createDiv({ cls: 'preview-verses-section' });
			versesSection.createEl('h4', { text: 'Tagged verses' });

			if (verses.length === 0) {
				versesSection.createEl('p', { text: 'No verses with this tag' });
				return;
			}

			// Group by book
			const byBook: { [book: string]: VerseTag[] } = {};
			verses.forEach(vt => {
				if (!byBook[vt.book]) byBook[vt.book] = [];
				byBook[vt.book].push(vt);
			});

			// Sort books by canonical order
			const bookOrder = this.plugin.getBooksArray(this.currentVersion);
			const versesContent = versesSection.createDiv({ cls: 'preview-verses-content' });

			Object.keys(byBook)
				.sort((a, b) => bookOrder.indexOf(a) - bookOrder.indexOf(b))
				.forEach(book => {
					const bookSection = versesContent.createDiv({ cls: 'preview-book-section' });
					bookSection.createEl('div', {
						text: `${book} (${byBook[book].length})`,
						cls: 'preview-book-header'
					});

					const versesList = bookSection.createDiv({ cls: 'preview-verses-list' });

					// Sort by chapter and verse
					byBook[book]
						.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)
						.forEach(vt => {
							const verseItem = versesList.createDiv({ cls: 'preview-verse-item' });

							const referenceText = `${vt.book} ${vt.chapter}:${vt.verse}`;
							verseItem.createEl('span', {
								text: referenceText,
								cls: 'preview-verse-reference'
							});

							const verseText = this.plugin.getVerseText(this.currentVersion, vt.book, vt.chapter, vt.verse);
							if (verseText) {
								const textPreview = verseItem.createDiv({ cls: 'preview-verse-text' });
								textPreview.textContent = verseText;
							}

							verseItem.addEventListener('click', () => {
								this.currentBook = vt.book;
								this.currentChapter = vt.chapter;
								this.viewMode = ViewMode.CHAPTER;
								void this.render();
								showToast(`Navigated to ${referenceText}`);
							});

							// Right-click to remove tag
							verseItem.addEventListener('contextmenu', (e) => {
								e.preventDefault();
								const menu = new Menu();
								menu.addItem((item) => {
									item.setTitle('Remove tag')
										.setIcon('x')
										.onClick(() => {
											this.plugin.removeVerseTag(vt.id);
											showToast(`Removed "${tagName}" from ${vt.book} ${vt.chapter}:${vt.verse}`);
											renderPreview(tagName);
											renderTagsList();
										});
								});
								menu.showAtMouseEvent(e);
							});
						});
				});

			// Action buttons
			const actionsDiv = previewPanel.createDiv({ cls: 'preview-actions' });

			const renameBtn = actionsDiv.createEl('button', { text: '✏ Rename Tag', cls: 'preview-action-btn' });
			renameBtn.addEventListener('click', () => {
				this.showRenameTagDialog(tagName);
			});

			const deleteBtn = actionsDiv.createEl('button', { text: '🗑️ Delete Tag', cls: 'preview-action-btn danger' });
			deleteBtn.addEventListener('click', () => {
				this.showDeleteTagConfirmation(tagName);
			});
		};

		// Find related tags (tags that appear on same verses)
		const findRelatedTags = (tagName: string): [string, number][] => {
			const verses = this.plugin.getVersesWithTag(tagName);
			const relatedTagCounts = new Map<string, number>();

			verses.forEach(vt => {
				// Find all tags on this verse
				const tagsOnVerse = this.plugin.verseTags.filter(
					t => t.book === vt.book && t.chapter === vt.chapter && t.verse === vt.verse
				);

				tagsOnVerse.forEach(t => {
					if (t.tag !== tagName) {
						relatedTagCounts.set(t.tag, (relatedTagCounts.get(t.tag) || 0) + 1);
					}
				});
			});

			return Array.from(relatedTagCounts.entries()).sort((a, b) => b[1] - a[1]);
		};

		// Render tags list based on view mode
		const renderTagsList = () => {
			listPanel.empty();

			const searchFilter = searchInput.value.toLowerCase();

			let filteredTags = allTags;
			if (searchFilter) {
				filteredTags = allTags.filter(tag => tag.toLowerCase().includes(searchFilter));
			}

			if (filteredTags.length === 0) {
				const emptyState = listPanel.createDiv({ cls: 'tags-no-data' });
				if (allTags.length === 0) {
					emptyState.createEl('div', { text: '🏷️', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No tags yet', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Add tags to verses from the chapter view!', cls: 'empty-state-text' });
				} else {
					emptyState.createEl('div', { text: '🔍', cls: 'empty-state-icon' });
					emptyState.createEl('div', { text: 'No matches found', cls: 'empty-state-title' });
					emptyState.createEl('div', { text: 'Try adjusting your search', cls: 'empty-state-text' });
				}
				return;
			}

			if (currentView === 'list') {
				renderListView(filteredTags);
			} else if (currentView === 'cloud') {
				renderCloudView(filteredTags);
			} else if (currentView === 'heatmap') {
				renderHeatmapView(filteredTags);
			}
		};

		// List View
		const renderListView = (tags: string[]) => {
			const tagsList = listPanel.createDiv({ cls: 'tags-list' });

			tags.forEach(tag => {
				const verseCount = this.plugin.getVersesWithTag(tag).length;

				const tagItem = tagsList.createDiv({
					cls: `tag-list-item ${selectedTag === tag ? 'selected' : ''}`
				});

				tagItem.createEl('span', { text: tag, cls: 'tag-name' });
				tagItem.createEl('span', { text: `(${verseCount})`, cls: 'tag-count' });

				tagItem.addEventListener('click', () => {
					selectedTag = tag;
					tagsList.querySelectorAll('.tag-list-item').forEach(el => el.removeClass('selected'));
					tagItem.addClass('selected');
					renderPreview(tag);
				});

				// Right-click for context menu
				tagItem.addEventListener('contextmenu', (e) => {
					e.preventDefault();
					const menu = new Menu();

					menu.addItem((item) => {
						item.setTitle('Rename tag')
							.setIcon('pencil')
							.onClick(() => {
								this.showRenameTagDialog(tag);
							});
					});

					menu.addItem((item) => {
						item.setTitle('Delete tag')
							.setIcon('trash')
							.onClick(() => {
								this.showDeleteTagConfirmation(tag);
							});
					});

					menu.showAtMouseEvent(e);
				});
			});
		};

		// Cloud View
		const renderCloudView = (tags: string[]) => {
			const cloudGrid = listPanel.createDiv({ cls: 'tags-cloud-grid' });

			// Calculate max frequency for scaling
			const frequencies = tags.map(tag => this.plugin.getVersesWithTag(tag).length);
			const maxFreq = Math.max(...frequencies, 1);

			tags.forEach(tag => {
				const count = this.plugin.getVersesWithTag(tag).length;
				const fontSize = 0.8 + (count / maxFreq) * 2; // Range: 0.8em to 2.8em

				const tagSpan = cloudGrid.createEl('span', {
					text: tag,
					cls: `tag-cloud-item ${selectedTag === tag ? 'selected' : ''}`,
					attr: { title: `${count} verse${count !== 1 ? 's' : ''}` }
				});
				tagSpan.style.fontSize = `${fontSize}em`;

				tagSpan.addEventListener('click', () => {
					selectedTag = tag;
					cloudGrid.querySelectorAll('.tag-cloud-item').forEach(el => el.removeClass('selected'));
					tagSpan.addClass('selected');
					renderPreview(tag);
				});
			});
		};

		// Heatmap View (66 books)
		const renderHeatmapView = (tags: string[]) => {
			const heatmapContainer = listPanel.createDiv({ cls: 'tags-heatmap-container' });
			heatmapContainer.createEl('h3', { text: 'Tag density by book' });

			// Calculate tag count per book
			const tagsByBook = new Map<string, number>();
			this.plugin.verseTags.forEach(vt => {
				if (tags.includes(vt.tag)) {
					tagsByBook.set(vt.book, (tagsByBook.get(vt.book) || 0) + 1);
				}
			});

			const maxCount = Math.max(...tagsByBook.values(), 1);

			const heatmapGrid = heatmapContainer.createDiv({ cls: 'tags-heatmap-grid' });

			// All 66 books
			const allBooks = [
				'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
				'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
				'1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
				'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
				'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
				'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
				'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
				'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
				'Matthew', 'Mark', 'Luke', 'John', 'Acts',
				'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
				'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy',
				'2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
				'1 Peter', '2 Peter', '1 John', '2 John', '3 John',
				'Jude', 'Revelation'
			];

			allBooks.forEach(book => {
				const count = tagsByBook.get(book) || 0;
				const cell = heatmapGrid.createDiv({ cls: 'heatmap-cell' });

				const intensity = count > 0 ? Math.max(0.2, count / maxCount) : 0;
				cell.style.backgroundColor = count > 0 ? `rgba(16, 185, 129, ${intensity})` : 'var(--background-secondary)';

				const abbrev = book.length > 6 ? book.substring(0, 5) + '.' : book;
				cell.createDiv({ cls: 'heatmap-cell-label', text: abbrev });
				if (count > 0) {
					cell.createDiv({ cls: 'heatmap-cell-count', text: count.toString() });
				}

				cell.setAttribute('title', `${book}: ${count} tag${count !== 1 ? 's' : ''}`);

				cell.addEventListener('click', () => {
					if (count > 0) {
						// Switch to list view and show tags for this book
						currentView = 'list';
						viewToggle.querySelectorAll('.view-toggle-btn').forEach(b => b.removeClass('active'));
						viewToggle.querySelector('.view-toggle-btn')?.addClass('active');
						renderTagsList();
					}
				});
			});
		};

		// Random tagged verse button handler
		randomBtn.addEventListener('click', () => {
			if (this.plugin.verseTags.length === 0) {
				showToast('No tagged verses to show');
				return;
			}
			const randomIndex = Math.floor(Math.random() * this.plugin.verseTags.length);
			const randomVerseTag = this.plugin.verseTags[randomIndex];
			const referenceText = `${randomVerseTag.book} ${randomVerseTag.chapter}:${randomVerseTag.verse}`;

			selectedTag = randomVerseTag.tag;
			renderTagsList();
			renderPreview(randomVerseTag.tag);

			showToast(`Random tagged verse: ${referenceText} - "${randomVerseTag.tag}"`);
		});

		// Event listeners
		searchInput.addEventListener('input', () => renderTagsList());

		// Keyboard shortcut: "/" to focus search
		tagsBrowser.setAttribute('tabindex', '0');
		tagsBrowser.addEventListener('keydown', (e) => {
			if (e.key === '/' && document.activeElement !== searchInput) {
				e.preventDefault();
				searchInput.focus();
			}
		});

		// Initial render
		renderTagsList();
		renderPreview(null);
	}

	/**
	 * Show dialog to create a new tag and apply to a verse
	 */
	showCreateTagDialog() {
		const modal = new Modal(this.app);
		modal.titleEl.setText('Create new tag');

		const content = modal.contentEl;
		content.createEl('p', {
			text: 'Enter a tag name. You can apply it to verses from the chapter view context menu.'
		});

		const input = content.createEl('input', {
			type: 'text',
			placeholder: 'Tag name (e.g., faith, healing)',
			cls: 'tag-input-field'
		});
		input.style.width = '100%';
		input.style.marginBottom = '16px';

		const btnContainer = content.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const createBtn = btnContainer.createEl('button', {
			text: 'Create',
			cls: 'mod-cta'
		});
		createBtn.addEventListener('click', async () => {
			const tagName = input.value.trim();
			if (tagName) {
				// Check if tag already exists (either in verseTags or registeredTags)
				const existingTags = this.plugin.getAllTagNames();
				if (existingTags.includes(tagName)) {
					showToast(`Tag "${tagName}" already exists.`);
					return;
				}

				// Add to registeredTags and save
				if (!this.plugin.settings.registeredTags) {
					this.plugin.settings.registeredTags = [];
				}
				this.plugin.settings.registeredTags.push(tagName);
				await this.plugin.saveSettings();

				showToast(`Tag "${tagName}" created. Apply it to verses using the context menu.`);
				modal.close();

				// Refresh the tags browser to show the new tag
				this.renderTagsBrowserMode(this.contentEl.querySelector('.content-area') as HTMLElement);
			}
		});

		modal.open();
		input.focus();
	}

	/**
	 * Show dialog to add a new tag to a specific verse
	 */
	showAddTagToVerseDialog(book: string, chapter: number, verse: number) {
		const modal = new Modal(this.app);
		modal.titleEl.setText('Add tag to verse');

		const content = modal.contentEl;
		content.createEl('p', {
			text: `Add a tag to ${book} ${chapter}:${verse}`
		});

		const input = content.createEl('input', {
			type: 'text',
			placeholder: 'Tag name (e.g., faith, healing, prayer)',
			cls: 'tag-input-field'
		});
		input.style.width = '100%';
		input.style.marginBottom = '16px';

		// Show existing tags as suggestions
		const allTags = this.plugin.getAllTagNames();
		if (allTags.length > 0) {
			const suggestionsDiv = content.createDiv({ cls: 'tag-suggestions' });
			suggestionsDiv.createEl('p', {
				text: 'Existing tags (click to use):',
				cls: 'tag-suggestions-label'
			});
			const tagsContainer = suggestionsDiv.createDiv({ cls: 'tag-suggestions-container' });

			allTags.forEach(tagName => {
				const tagChip = tagsContainer.createEl('span', {
					text: tagName,
					cls: 'tag-suggestion-chip'
				});
				tagChip.addEventListener('click', () => {
					input.value = tagName;
					input.focus();
				});
			});
		}

		const btnContainer = content.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const addBtn = btnContainer.createEl('button', {
			text: 'Add tag',
			cls: 'mod-cta'
		});
		addBtn.addEventListener('click', () => {
			const tagName = input.value.trim();
			if (tagName) {
				// Check if this tag already exists on this verse
				const existingTags = this.plugin.getTagsForVerse(book, chapter, verse);
				if (existingTags.some(t => t.tag === tagName)) {
					showToast(`Verse already has "${tagName}" tag`);
					return;
				}

				const newTag: VerseTag = {
					id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					book,
					chapter,
					verse,
					tag: tagName,
					createdAt: Date.now()
				};
				this.plugin.addVerseTag(newTag);
				showToast(`Added "${tagName}" tag to ${book} ${chapter}:${verse}`);
				modal.close();
				this.renderAndScrollToVerse(verse);
			}
		});

		// Allow Enter key to submit
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				addBtn.click();
			}
		});

		modal.open();
		input.focus();
	}

	/**
	 * Show dialog to rename a tag
	 */
	showRenameTagDialog(oldName: string) {
		const modal = new Modal(this.app);
		modal.titleEl.setText('Rename tag');

		const content = modal.contentEl;
		content.createEl('p', {
			text: `Rename tag "${oldName}" to:`
		});

		const input = content.createEl('input', {
			type: 'text',
			value: oldName,
			cls: 'tag-input-field'
		});
		input.style.width = '100%';
		input.style.marginBottom = '16px';

		const btnContainer = content.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const renameBtn = btnContainer.createEl('button', {
			text: 'Rename',
			cls: 'mod-cta'
		});
		renameBtn.addEventListener('click', () => {
			const newName = input.value.trim();
			if (newName && newName !== oldName) {
				this.plugin.renameTag(oldName, newName);
				showToast(`Renamed "${oldName}" to "${newName}"`);
				modal.close();
				void this.render();
			}
		});

		modal.open();
		input.focus();
		input.select();
	}

	/**
	 * Show confirmation dialog to delete a tag from all verses
	 */
	showDeleteTagConfirmation(tagName: string) {
		const verseCount = this.plugin.getVersesWithTag(tagName).length;

		const modal = new Modal(this.app);
		modal.titleEl.setText('Delete tag');

		const content = modal.contentEl;
		content.createEl('p', {
			text: `Are you sure you want to delete the tag "${tagName}"?`
		});
		content.createEl('p', {
			text: `This will remove it from ${verseCount} verse(s).`,
			cls: 'delete-warning'
		});

		const btnContainer = content.createDiv({ cls: 'modal-button-container' });

		const cancelBtn = btnContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.addEventListener('click', () => modal.close());

		const deleteBtn = btnContainer.createEl('button', {
			text: 'Delete',
			cls: 'mod-warning'
		});
		deleteBtn.addEventListener('click', () => {
			this.plugin.deleteTagFromAll(tagName);
			showToast(`Deleted tag "${tagName}" from ${verseCount} verses`);
			modal.close();
			void this.render();
		});

		modal.open();
	}

	/**
	 * Export bookmarks to a JSON file
	 */
	async exportBookmarks() {
		try {
			const bookmarks = this.plugin.bookmarks;

			if (bookmarks.length === 0) {
				showToast('No bookmarks to export');
				return;
			}

			// Create export data with metadata
			const exportData = {
				exportDate: new Date().toISOString(),
				version: '1.0',
				bookmarkCount: bookmarks.length,
				bookmarks: bookmarks
			};

			// Convert to JSON
			const json = JSON.stringify(exportData, null, 2);

			// Create filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
			const filename = `bible-bookmarks-${timestamp}.json`;

			// Create blob and download
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);

			showToast(`✓ Exported ${bookmarks.length} bookmarks to ${filename}`);

		} catch (error) {
			console.error('Error exporting bookmarks:', error);
			showToast('Failed to export bookmarks');
		}
	}

	/**
	 * Import bookmarks from a JSON file
	 */
	async importBookmarks() {
		try {
			// Create file input
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';

			input.onchange = async (e: Event) => {
				const target = e.target as HTMLInputElement;
				const file = target.files?.[0];

				if (!file) return;

				try {
					// Read file
					const text = await file.text();
					const importData = JSON.parse(text);

					// Validate structure
					if (!importData.bookmarks || !Array.isArray(importData.bookmarks)) {
						showToast('Invalid bookmark file format');
						return;
					}

					// Ask user for import mode
					const mode = await this.showBookmarkImportModeDialog(importData.bookmarks.length);

					if (mode === 'cancel') return;

					let imported = 0;
					let skipped = 0;

					if (mode === 'replace') {
						// Replace all existing bookmarks
						this.plugin.bookmarks = importData.bookmarks;
						imported = importData.bookmarks.length;
					} else {
						// Merge - add only new bookmarks (check for duplicates)
						importData.bookmarks.forEach((bookmark: Bookmark) => {
							// Check if bookmark already exists (same book, chapter, verse)
							const exists = this.plugin.bookmarks.some(b =>
								b.book === bookmark.book &&
								b.chapter === bookmark.chapter &&
								b.verse === bookmark.verse
							);

							if (!exists) {
								// Generate new ID to avoid conflicts
								bookmark.id = `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
								this.plugin.bookmarks.push(bookmark);
								imported++;
							} else {
								skipped++;
							}
						});
					}

					// Save
					await this.plugin.saveHighlightsAndNotes();

					// Refresh view
					await this.render();

					// Show result
					if (mode === 'replace') {
						showToast(`✓ Replaced all bookmarks with ${imported} imported bookmarks`);
					} else {
						showToast(`✓ Imported ${imported} bookmarks (${skipped} duplicates skipped)`);
					}

				} catch (error) {
					console.error('Error importing bookmarks:', error);
					showToast('Failed to import bookmarks - invalid file format');
				}
			};

			// Trigger file selection
			input.click();

		} catch (error) {
			console.error('Error importing bookmarks:', error);
			showToast('Failed to import bookmarks');
		}
	}

	/**
	 * Show dialog to choose import mode for bookmarks (merge or replace)
	 */
	async showBookmarkImportModeDialog(importCount: number): Promise<'merge' | 'replace' | 'cancel'> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Import bookmarks');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `You are about to import ${importCount} bookmarks.`
			});
			content.createEl('p', {
				text: `You currently have ${this.plugin.bookmarks.length} bookmarks.`
			});
			content.createEl('p', {
				text: 'How would you like to import?',
				cls: 'import-question'
			});

			// Merge option
			const mergeDiv = content.createDiv({ cls: 'import-option' });
			mergeDiv.createEl('strong', { text: 'Merge' });
			mergeDiv.createEl('p', {
				text: 'Add imported bookmarks to existing ones. Duplicates will be skipped.'
			});

			const mergeBtn = mergeDiv.createEl('button', {
				text: 'Merge',
				cls: 'mod-cta'
			});
			mergeBtn.addEventListener('click', () => {
				modal.close();
				resolve('merge');
			});

			// Replace option
			const replaceDiv = content.createDiv({ cls: 'import-option' });
			replaceDiv.createEl('strong', { text: 'Replace' });
			replaceDiv.createEl('p', {
				text: 'Delete all existing bookmarks and replace with imported ones.',
				cls: 'warning-text'
			});

			const replaceBtn = replaceDiv.createEl('button', {
				text: 'Replace all',
				cls: 'mod-warning'
			});
			replaceBtn.addEventListener('click', () => {
				modal.close();
				resolve('replace');
			});

			// Cancel option
			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });
			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cancel'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve('cancel');
			});

			modal.open();
		});
	}

	/**
	 * Show confirmation dialog for deleting a bookmark
	 */
	async showDeleteBookmarkConfirmation(reference: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('⚠️ Delete Bookmark');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `Delete bookmark for ${reference}?`,
				cls: 'warning-text'
			});
			content.createEl('p', {
				text: 'This action is PERMANENT and CANNOT be undone.',
				cls: 'warning-text-strong'
			});

			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl('button', {
				text: 'Delete bookmark',
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	/**
	 * Show confirmation dialog for clearing all bookmarks
	 */
	async showClearAllBookmarksConfirmation(): Promise<boolean> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('⚠️ Clear All Bookmarks');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `You are about to delete ${this.plugin.bookmarks.length} bookmarks.`,
				cls: 'warning-text'
			});
			content.createEl('p', {
				text: 'This action is PERMANENT and CANNOT be undone.',
				cls: 'warning-text-strong'
			});
			content.createEl('p', {
				text: 'Consider exporting your bookmarks first as a backup.',
				cls: 'warning-hint'
			});

			const buttonContainer = content.createDiv({ cls: 'confirmation-buttons' });

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel',
				cls: 'mod-cta'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve(false);
			});

			const confirmBtn = buttonContainer.createEl('button', {
				text: 'Delete all bookmarks',
				cls: 'mod-warning'
			});
			confirmBtn.addEventListener('click', () => {
				modal.close();
				resolve(true);
			});

			modal.open();
		});
	}

	/**
	 * Export highlights to a JSON file
	 */
	async exportHighlights() {
		try {
			const highlights = this.plugin.highlights;

			if (highlights.length === 0) {
				showToast('No highlights to export');
				return;
			}

			// Create export data with metadata
			const exportData = {
				exportDate: new Date().toISOString(),
				version: '1.0',
				highlightCount: highlights.length,
				highlights: highlights
			};

			// Convert to JSON
			const json = JSON.stringify(exportData, null, 2);

			// Create filename with timestamp
			const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
			const filename = `bible-highlights-${timestamp}.json`;

			// Create blob and download
			const blob = new Blob([json], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			link.click();
			URL.revokeObjectURL(url);

			showToast(`✓ Exported ${highlights.length} highlights to ${filename}`);

		} catch (error) {
			console.error('Error exporting highlights:', error);
			showToast('Failed to export highlights');
		}
	}

	/**
	 * Import highlights from a JSON file
	 */
	async importHighlights() {
		try {
			// Create file input
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';

			input.onchange = async (e: Event) => {
				const target = e.target as HTMLInputElement;
				const file = target.files?.[0];

				if (!file) return;

				try {
					// Read file
					const text = await file.text();
					const importData = JSON.parse(text);

					// Validate structure
					if (!importData.highlights || !Array.isArray(importData.highlights)) {
						showToast('Invalid highlight file format');
						return;
					}

					// Ask user for import mode
					const mode = await this.showImportModeDialog(importData.highlights.length);

					if (mode === 'cancel') return;

					let imported = 0;
					let skipped = 0;

					if (mode === 'replace') {
						// Replace all existing highlights
						this.plugin.highlights = importData.highlights;
						imported = importData.highlights.length;
					} else {
						// Merge - add only new highlights (check for duplicates)
						importData.highlights.forEach((highlight: Highlight) => {
							// Check if highlight already exists (same book, chapter, verse, text)
							const exists = this.plugin.highlights.some(h =>
								h.book === highlight.book &&
								h.chapter === highlight.chapter &&
								h.verse === highlight.verse &&
								h.text === highlight.text
							);

							if (!exists) {
								// Generate new ID to avoid conflicts
								highlight.id = `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
								this.plugin.highlights.push(highlight);
								imported++;
							} else {
								skipped++;
							}
						});
					}

					// Save
					await this.plugin.saveHighlightsAndNotes();

					// Refresh view
					await this.render();

					// Show result
					if (mode === 'replace') {
						showToast(`✓ Replaced all highlights with ${imported} imported highlights`);
					} else {
						showToast(`✓ Imported ${imported} highlights (${skipped} duplicates skipped)`);
					}

				} catch (error) {
					console.error('Error importing highlights:', error);
					showToast('Failed to import highlights - invalid file format');
				}
			};

			// Trigger file selection
			input.click();

		} catch (error) {
			console.error('Error importing highlights:', error);
			showToast('Failed to import highlights');
		}
	}

	/**
	 * Show dialog to choose import mode (merge or replace)
	 */
	async showImportModeDialog(importCount: number): Promise<'merge' | 'replace' | 'cancel'> {
		return new Promise((resolve) => {
			const modal = new Modal(this.app);
			modal.titleEl.setText('Import highlights');

			const content = modal.contentEl;
			content.createEl('p', {
				text: `You are about to import ${importCount} highlights.`
			});
			content.createEl('p', {
				text: `You currently have ${this.plugin.highlights.length} highlights.`
			});
			content.createEl('p', {
				text: 'How would you like to import?',
				cls: 'import-mode-question'
			});

			const buttonContainer = content.createDiv({ cls: 'import-mode-buttons' });

			const mergeBtn = buttonContainer.createEl('button', {
				text: 'Merge (Add new, skip duplicates)',
				cls: 'mod-cta'
			});
			mergeBtn.addEventListener('click', () => {
				modal.close();
				resolve('merge');
			});

			const replaceBtn = buttonContainer.createEl('button', {
				text: 'Replace (Delete existing)',
				cls: 'mod-warning'
			});
			replaceBtn.addEventListener('click', () => {
				modal.close();
				resolve('replace');
			});

			const cancelBtn = buttonContainer.createEl('button', {
				text: 'Cancel'
			});
			cancelBtn.addEventListener('click', () => {
				modal.close();
				resolve('cancel');
			});

			modal.open();
		});
	}

	/**
	 * Render the achievements browser mode
	 */
	renderAchievementsMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'achievements-header' });
		header.createEl('h2', { text: '🏆 Achievements' });

		// Progress summary
		const progress = this.plugin.getAchievementProgress();
		const progressDiv = header.createDiv({ cls: 'achievements-progress-summary' });
		progressDiv.createEl('span', { text: `${progress.unlocked}/${progress.total} Unlocked` });

		const progressBar = progressDiv.createDiv({ cls: 'achievements-progress-bar' });
		const progressFill = progressBar.createDiv({ cls: 'achievements-progress-fill' });
		progressFill.style.width = `${progress.percentage}%`;
		progressBar.setAttribute('title', `${progress.percentage}% complete`);

		// Stats summary
		const stats = this.plugin.settings.achievementStats || DEFAULT_ACHIEVEMENT_STATS;
		const statsDiv = container.createDiv({ cls: 'achievements-stats' });
		statsDiv.createEl('h3', { text: 'Your stats' });

		const statsGrid = statsDiv.createDiv({ cls: 'stats-grid' });

		const statItems = [
			{ icon: 'book-open', label: 'Chapters read', value: stats.totalChaptersRead },
			{ icon: 'sticky-note', label: 'Notes created', value: stats.totalNotesCreated },
			{ icon: 'highlighter', label: 'Highlights', value: stats.totalHighlightsAdded },
			{ icon: 'flame', label: 'Longest streak', value: `${stats.longestStreak} days` },
			{ icon: 'book-marked', label: 'Books completed', value: stats.booksCompleted.length }
		];

		statItems.forEach(item => {
			const statEl = statsGrid.createDiv({ cls: 'stat-item' });
			const iconSpan = statEl.createSpan({ cls: 'stat-icon' });
			setIcon(iconSpan, item.icon);
			statEl.createSpan({ text: String(item.value), cls: 'stat-value' });
			statEl.createSpan({ text: item.label, cls: 'stat-label' });
		});

		// Achievement categories
		const categories = ['reading', 'notes', 'highlights', 'streaks', 'milestones'] as const;
		const categoryLabels: Record<string, string> = {
			reading: '📖 Reading',
			notes: '📝 Notes',
			highlights: '🎨 Highlights',
			streaks: '🔥 Streaks',
			milestones: '⭐ Milestones'
		};

		const achievementsList = container.createDiv({ cls: 'achievements-list' });

		categories.forEach(category => {
			const categoryAchievements = this.plugin.getAchievements().filter(
				a => a.achievement.category === category
			);

			if (categoryAchievements.length === 0) return;

			const categorySection = achievementsList.createDiv({ cls: 'achievement-category' });
			categorySection.createEl('h3', { text: categoryLabels[category] });

			const achievementsGrid = categorySection.createDiv({ cls: 'achievements-grid' });

			categoryAchievements.forEach(({ achievement, unlocked }) => {
				const rarityColors: Record<string, string> = {
					common: '#9ca3af',
					uncommon: '#22c55e',
					rare: '#3b82f6',
					epic: '#a855f7',
					legendary: '#f59e0b'
				};

				const card = achievementsGrid.createDiv({
					cls: `achievement-card ${unlocked ? 'unlocked' : 'locked'} rarity-${achievement.rarity}`
				});

				card.style.setProperty('--rarity-color', rarityColors[achievement.rarity]);

				const iconDiv = card.createDiv({ cls: 'achievement-icon' });
				const iconSpan = iconDiv.createSpan();
				setIcon(iconSpan, unlocked ? achievement.icon : 'lock');

				const infoDiv = card.createDiv({ cls: 'achievement-info' });
				infoDiv.createEl('span', { text: achievement.name, cls: 'achievement-name' });
				infoDiv.createEl('span', { text: achievement.description, cls: 'achievement-desc' });

				// Rarity badge
				const rarityBadge = card.createEl('span', {
					text: achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1),
					cls: `rarity-badge rarity-${achievement.rarity}`
				});
			});
		});
	}

	/**
	 * Render the Reading Plan view mode
	 */
	renderReadingPlanMode(container: HTMLElement) {
		const activePlans = this.plugin.getActiveReadingPlans();
		const todaysReadings = this.plugin.getTodaysReadings();

		// Header
		const header = container.createDiv({ cls: 'reading-plan-view-header' });
		const h2 = header.createEl('h2');
		const readingIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(readingIcon, 'book-open-check');
		h2.createSpan({ text: 'Reading plans' });

		// Subtitle showing active count
		if (activePlans.length > 0) {
			header.createEl('p', {
				text: `${activePlans.length} active plan${activePlans.length > 1 ? 's' : ''}`,
				cls: 'reading-plan-subtitle'
			});
		}

		// Plan selector section - always show all plans with toggle
		const planSelectorDiv = container.createDiv({ cls: 'reading-plan-selector-section' });
		planSelectorDiv.createEl('h3', { text: 'Available reading plans' });
		planSelectorDiv.createEl('p', {
			text: 'Toggle plans on/off to track multiple reading plans simultaneously.',
			cls: 'reading-plan-intro'
		});

		const plansGrid = planSelectorDiv.createDiv({ cls: 'reading-plans-grid' });

		READING_PLANS.forEach(p => {
			const isActive = this.plugin.settings.activeReadingPlans.includes(p.id);
			const progress = this.plugin.getReadingPlanProgress(p.id);
			const planCard = plansGrid.createDiv({ cls: `reading-plan-card ${isActive ? 'active' : ''}` });

			// Toggle checkbox
			const toggleRow = planCard.createDiv({ cls: 'plan-toggle-row' });
			const toggleLabel = toggleRow.createEl('label', { cls: 'plan-toggle-label' });
			const checkbox = toggleLabel.createEl('input', { type: 'checkbox' });
			checkbox.checked = isActive;
			checkbox.addEventListener('change', async () => {
				await this.plugin.toggleReadingPlan(p.id);
				await this.render();
				showToast(checkbox.checked ? `Started ${p.name}!` : `Paused ${p.name}`);
			});
			const toggleSlider = toggleLabel.createSpan({ cls: 'plan-toggle-slider' });

			const planIcon = planCard.createDiv({ cls: 'plan-card-icon' });
			setIcon(planIcon, isActive ? 'book-open-check' : 'book-open');

			planCard.createEl('h4', { text: p.name });
			planCard.createEl('p', { text: p.description, cls: 'plan-card-desc' });
			planCard.createEl('span', { text: `${p.totalDays} days`, cls: 'plan-card-duration' });

			// Show progress if there's any
			if (progress > 0 || isActive) {
				const progressContainer = planCard.createDiv({ cls: 'plan-card-progress' });
				const progressBar = progressContainer.createDiv({ cls: 'plan-card-progress-bar' });
				const progressFill = progressBar.createDiv({ cls: 'plan-card-progress-fill' });
				progressFill.style.width = `${progress}%`;
				progressContainer.createSpan({ text: `${progress}%`, cls: 'plan-card-progress-text' });
			}
		});

		// Adaptive scheduling section (only show if there are active plans)
		if (activePlans.length > 0) {
			const adaptiveSection = container.createDiv({ cls: 'reading-plan-adaptive-section' });
			adaptiveSection.createEl('h3', { text: '⚡ Schedule Mode' });
			adaptiveSection.createEl('p', { text: 'Applies to all active plans', cls: 'text-muted schedule-mode-note' });

			const modeSelector = adaptiveSection.createDiv({ cls: 'adaptive-mode-selector' });
			const modes: { id: 'normal' | 'catch-up' | 'skip-ahead'; label: string; desc: string; icon: string }[] = [
				{ id: 'normal', label: 'Normal', desc: 'Follow the planned schedule', icon: 'calendar' },
				{ id: 'catch-up', label: 'Catch up', desc: 'Double readings to get back on track', icon: 'fast-forward' },
				{ id: 'skip-ahead', label: 'Skip ahead', desc: 'Jump to today\'s date in the plan', icon: 'skip-forward' }
			];

			modes.forEach(mode => {
				const modeCard = modeSelector.createDiv({
					cls: `adaptive-mode-card ${this.plugin.settings.readingPlanMode === mode.id ? 'active' : ''}`
				});
				const modeIcon = modeCard.createDiv({ cls: 'mode-icon' });
				setIcon(modeIcon, mode.icon);
				modeCard.createDiv({ text: mode.label, cls: 'mode-label' });
				modeCard.createDiv({ text: mode.desc, cls: 'mode-desc' });

				modeCard.addEventListener('click', async () => {
					this.plugin.settings.readingPlanMode = mode.id;
					await this.plugin.saveSettings();
					await this.render();
					showToast(`Switched to ${mode.label} mode`);
				});
			});
		}

		// Today's reading section - show all active plans' readings
		if (todaysReadings.length > 0) {
			const todaySection = container.createDiv({ cls: 'reading-plan-today-section' });
			todaySection.createEl('h3', { text: "📅 Today's Readings" });

			todaysReadings.forEach(reading => {
				const todayCard = todaySection.createDiv({ cls: 'today-reading-card' });

				// Plan name header
				const planHeader = todayCard.createDiv({ cls: 'today-plan-header' });
				const planIcon = planHeader.createSpan({ cls: 'today-plan-icon' });
				setIcon(planIcon, 'book-open-check');
				planHeader.createSpan({ text: reading.plan.name, cls: 'today-plan-name' });
				planHeader.createSpan({ text: `Day ${reading.day} of ${reading.plan.totalDays}`, cls: 'today-plan-day' });

				if (reading.completed) {
					todayCard.addClass('completed');
					const completedBadge = todayCard.createDiv({ cls: 'today-completed-badge' });
					setIcon(completedBadge, 'check-circle');
					completedBadge.createSpan({ text: 'Completed!' });
				}

				const passagesDiv = todayCard.createDiv({ cls: 'today-passages' });
				reading.passages.forEach(passage => {
					const passageLink = passagesDiv.createEl('button', {
						text: passage,
						cls: 'today-passage-btn'
					});
					passageLink.addEventListener('click', () => {
						const parsed = this.parsePassageReference(passage) || this.parseSimpleReference(passage);
						if (parsed) {
							this.currentBook = parsed.book;
							this.currentChapter = parsed.chapter;
							this.viewMode = ViewMode.CHAPTER;
							void this.render();
							showToast(`Navigated to ${passage}`);
						}
					});
				});

				if (!reading.completed) {
					const markCompleteBtn = todayCard.createEl('button', {
						cls: 'mark-complete-btn'
					});
					const btnIcon = markCompleteBtn.createSpan({ cls: 'btn-icon' });
					setIcon(btnIcon, 'check');
					markCompleteBtn.createSpan({ text: 'Mark as Complete' });
					markCompleteBtn.addEventListener('click', async () => {
						await this.plugin.markReadingComplete(reading.day, reading.plan.id);
						await this.render();
						showToast(`${reading.plan.name} Day ${reading.day} complete! 🎉`);
					});
				}
			});
		}

		// Progress section for each active plan
		if (activePlans.length > 0) {
			const progressSection = container.createDiv({ cls: 'reading-plan-progress-section' });
			progressSection.createEl('h3', { text: '📊 Progress Overview' });

			activePlans.forEach(plan => {
				const progress = this.plugin.getReadingPlanProgress(plan.id);
				const completedDays = (this.plugin.settings.readingPlanProgress[plan.id] || []).length;
				const remainingDays = plan.totalDays - completedDays;
				const startDate = this.plugin.settings.readingPlanStartDates[plan.id];

				const planProgressCard = progressSection.createDiv({ cls: 'plan-progress-card' });

				const planProgressHeader = planProgressCard.createDiv({ cls: 'plan-progress-header' });
				const headerIcon = planProgressHeader.createSpan({ cls: 'plan-progress-icon' });
				setIcon(headerIcon, 'book-open-check');
				planProgressHeader.createSpan({ text: plan.name, cls: 'plan-progress-name' });

				const progressBarContainer = planProgressCard.createDiv({ cls: 'progress-bar-large-container' });
				const progressBar = progressBarContainer.createDiv({ cls: 'progress-bar-large' });
				const progressFill = progressBar.createDiv({ cls: 'progress-bar-fill' });
				progressFill.style.width = `${progress}%`;
				progressBarContainer.createSpan({ text: `${progress}%`, cls: 'progress-percentage' });

				const statsGrid = planProgressCard.createDiv({ cls: 'plan-progress-stats' });
				statsGrid.createSpan({ text: `${completedDays}/${plan.totalDays} days`, cls: 'stat-item' });
				statsGrid.createSpan({ text: `${remainingDays} remaining`, cls: 'stat-item' });
				if (startDate) {
					statsGrid.createSpan({ text: `Started ${startDate}`, cls: 'stat-item' });
				}

				// Check if behind schedule
				if (startDate) {
					const start = new Date(startDate);
					const today = new Date();
					const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
					const expectedDay = Math.min(daysSinceStart, plan.totalDays);
					const behindBy = expectedDay - completedDays;

					if (behindBy > 1 && this.plugin.settings.readingPlanMode !== 'skip-ahead') {
						const behindWarning = planProgressCard.createDiv({ cls: 'behind-schedule-warning' });
						const warningIcon = behindWarning.createSpan({ cls: 'warning-icon' });
						setIcon(warningIcon, 'alert-triangle');
						behindWarning.createSpan({ text: `${behindBy} days behind schedule` });
					}
				}
			});
		}
	}

	renderStudyJournalMode(container: HTMLElement) {
		// Header
		const header = container.createDiv({ cls: 'journal-header' });
		const h2 = header.createEl('h2');
		const journalIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(journalIcon, 'book-text');
		h2.createSpan({ text: 'Study journal' });

		// Manual entry section
		const entrySection = container.createDiv({ cls: 'journal-entry-section' });
		entrySection.createEl('h3', { text: 'Add reflection' });

		const textarea = entrySection.createEl('textarea', {
			cls: 'journal-textarea',
			placeholder: 'Write your reflections, prayers, or questions here...',
			attr: { rows: '6' }
		});

		const saveBtn = entrySection.createEl('button', {
			text: 'Save entry',
			cls: 'journal-save-btn'
		});

		saveBtn.addEventListener('click', async () => {
			const content = textarea.value.trim();
			if (!content) {
				showToast('Entry cannot be empty');
				return;
			}

			const entry: JournalEntry = {
				id: `manual-${Date.now()}`,
				date: new Date().toISOString(),
				type: 'manual',
				content
			};

			this.plugin.settings.journalEntries.push(entry);
			await this.plugin.saveSettings();
			textarea.value = '';
			showToast('Entry saved to journal');
			this.render(); // Refresh to show new entry
		});

		// Timeline view of entries
		const timelineSection = container.createDiv({ cls: 'journal-timeline-section' });
		timelineSection.createEl('h3', { text: 'Session history' });

		const entries = [...this.plugin.settings.journalEntries].sort((a, b) =>
			new Date(b.date).getTime() - new Date(a.date).getTime()
		);

		if (entries.length === 0) {
			timelineSection.createEl('p', {
				text: 'No journal entries yet. Start studying to create your first session entry, or write a manual reflection above.',
				cls: 'journal-empty-state'
			});
		} else {
			const timeline = timelineSection.createDiv({ cls: 'journal-timeline' });

			entries.forEach(entry => {
				const entryCard = timeline.createDiv({ cls: `journal-entry ${entry.type}-entry` });

				// Entry header (date + type)
				const entryHeader = entryCard.createDiv({ cls: 'journal-entry-header' });
				const dateStr = new Date(entry.date).toLocaleString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit'
				});
				entryHeader.createSpan({ text: dateStr, cls: 'journal-entry-date' });

				const typeBadge = entryHeader.createSpan({
					text: entry.type === 'session' ? 'Study session' : 'Manual entry',
					cls: `journal-entry-type ${entry.type}`
				});

				// Entry content
				const entryContent = entryCard.createDiv({ cls: 'journal-entry-content' });

				if (entry.type === 'session') {
					// Session entry - show stats
					const statsGrid = entryContent.createDiv({ cls: 'journal-session-stats' });

					if (entry.duration) {
						const statItem = statsGrid.createDiv({ cls: 'stat-item' });
						const iconSpan = statItem.createSpan({ cls: 'stat-icon' });
						setIcon(iconSpan, 'clock');
						statItem.createSpan({ text: `${entry.duration} min`, cls: 'stat-value' });
					}

					if (entry.versesRead) {
						const statItem = statsGrid.createDiv({ cls: 'stat-item' });
						const iconSpan = statItem.createSpan({ cls: 'stat-icon' });
						setIcon(iconSpan, 'book-open');
						statItem.createSpan({ text: `${entry.versesRead} verses`, cls: 'stat-value' });
					}

					if (entry.notesCreated && entry.notesCreated > 0) {
						const statItem = statsGrid.createDiv({ cls: 'stat-item' });
						const iconSpan = statItem.createSpan({ cls: 'stat-icon' });
						setIcon(iconSpan, 'sticky-note');
						statItem.createSpan({ text: `${entry.notesCreated} notes`, cls: 'stat-value' });
					}

					if (entry.highlightsAdded && entry.highlightsAdded > 0) {
						const statItem = statsGrid.createDiv({ cls: 'stat-item' });
						const iconSpan = statItem.createSpan({ cls: 'stat-icon' });
						setIcon(iconSpan, 'highlighter');
						statItem.createSpan({ text: `${entry.highlightsAdded} highlights`, cls: 'stat-value' });
					}

					// Chapters visited
					if (entry.chaptersVisited && entry.chaptersVisited.length > 0) {
						const chaptersDiv = entryContent.createDiv({ cls: 'journal-chapters-visited' });
						chaptersDiv.createEl('h4', { text: 'Chapters read:' });
						const chaptersList = chaptersDiv.createDiv({ cls: 'chapters-list' });
						entry.chaptersVisited.forEach(ch => {
							chaptersList.createSpan({ text: ch, cls: 'chapter-tag' });
						});
					}
				} else {
					// Manual entry - show content
					const contentP = entryContent.createEl('p', { cls: 'journal-manual-content' });
					contentP.textContent = entry.content || '';
				}

				// Delete button (small icon button)
				const deleteBtn = entryCard.createEl('button', {
					cls: 'journal-delete-btn',
					attr: { 'aria-label': 'Delete entry', title: 'Delete entry' }
				});
				const deleteIcon = deleteBtn.createSpan();
				setIcon(deleteIcon, 'trash-2');

				deleteBtn.addEventListener('click', async () => {
					const confirmed = await showConfirmModal(
						this.app,
						'Delete entry?',
						'Are you sure you want to delete this journal entry?',
						{ confirmText: 'Delete', isDestructive: true }
					);
					if (confirmed) {
						const index = this.plugin.settings.journalEntries.findIndex(e => e.id === entry.id);
						if (index !== -1) {
							this.plugin.settings.journalEntries.splice(index, 1);
							await this.plugin.saveSettings();
							showToast('Entry deleted');
							await this.render();
						}
					}
				});
			});

			// Export button
			const exportSection = timelineSection.createDiv({ cls: 'journal-export-section' });
			const exportBtn = exportSection.createEl('button', {
				text: 'Export Journal as Markdown',
				cls: 'journal-export-btn'
			});

			exportBtn.addEventListener('click', async () => {
				let markdown = '# Study Journal\n\n';
				markdown += `Generated: ${new Date().toLocaleDateString()}\n\n---\n\n`;

				entries.forEach(entry => {
					const dateStr = new Date(entry.date).toLocaleString();
					markdown += `## ${dateStr}\n`;
					markdown += `**Type:** ${entry.type === 'session' ? 'Study session' : 'Manual entry'}\n\n`;

					if (entry.type === 'session') {
						markdown += `- **Duration:** ${entry.duration} minutes\n`;
						markdown += `- **Verses Read:** ${entry.versesRead}\n`;
						if (entry.notesCreated) markdown += `- **Notes Created:** ${entry.notesCreated}\n`;
						if (entry.highlightsAdded) markdown += `- **Highlights Added:** ${entry.highlightsAdded}\n`;
						if (entry.chaptersVisited && entry.chaptersVisited.length > 0) {
							markdown += `- **Chapters:** ${entry.chaptersVisited.join(', ')}\n`;
						}
					} else {
						markdown += entry.content + '\n';
					}

					markdown += '\n---\n\n';
				});

				// Copy to clipboard
				await navigator.clipboard.writeText(markdown);
				showToast('Journal exported to clipboard as Markdown');
			});
		}
	}

	// ========== COLLECTIONS MODE (15B) ==========
	renderCollectionsMode(container: HTMLElement) {
		// Ensure collections array exists
		if (!this.plugin.settings.collections) {
			this.plugin.settings.collections = [];
		}

		const header = container.createDiv({ cls: 'collections-header' });
		const h2 = header.createEl('h2');
		const titleIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'folder-open');
		h2.createSpan({ text: 'Study collections' });

		// Two-panel layout
		const layout = container.createDiv({ cls: 'collections-layout' });
		const listPanel = layout.createDiv({ cls: 'collections-list-panel' });
		const detailPanel = layout.createDiv({ cls: 'collections-detail-panel' });

		// New collection button
		const newBtn = listPanel.createEl('button', { cls: 'collections-new-btn' });
		const plusIcon = newBtn.createSpan({ cls: 'btn-icon' });
		setIcon(plusIcon, 'plus');
		newBtn.createSpan({ text: 'New collection' });
		this.registerDomEvent(newBtn, 'click', async (e: MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			const newId = `col-${Date.now()}`;
			const collection: Collection = {
				id: newId,
				name: 'New collection',
				description: '',
				createdAt: Date.now(),
				verses: []
			};
			if (!this.plugin.settings.collections) {
				this.plugin.settings.collections = [];
			}
			this.plugin.settings.collections.push(collection);
			await this.plugin.saveSettings();
			// Auto-select the new collection
			this.selectedCollectionId = newId;
			await this.render();
			showToast('Created new collection - click the name to rename it');
		});

		// Template buttons
		const templates = listPanel.createDiv({ cls: 'collections-templates' });
		templates.createEl('h4', { text: 'Quick start templates' });
		const templateData = [
			{ name: 'Armor of God', verses: ['Ephesians 6:10', 'Ephesians 6:11', 'Ephesians 6:12', 'Ephesians 6:13', 'Ephesians 6:14', 'Ephesians 6:15', 'Ephesians 6:16', 'Ephesians 6:17', 'Ephesians 6:18'] },
			{ name: 'Fruit of the Spirit', verses: ['Galatians 5:22', 'Galatians 5:23'] },
			{ name: 'Beatitudes', verses: ['Matthew 5:3', 'Matthew 5:4', 'Matthew 5:5', 'Matthew 5:6', 'Matthew 5:7', 'Matthew 5:8', 'Matthew 5:9', 'Matthew 5:10', 'Matthew 5:11', 'Matthew 5:12'] },
			{ name: "Lord's Prayer", verses: ['Matthew 6:9', 'Matthew 6:10', 'Matthew 6:11', 'Matthew 6:12', 'Matthew 6:13'] },
			{ name: 'Love Chapter', verses: ['1 Corinthians 13:1', '1 Corinthians 13:2', '1 Corinthians 13:3', '1 Corinthians 13:4', '1 Corinthians 13:5', '1 Corinthians 13:6', '1 Corinthians 13:7', '1 Corinthians 13:8', '1 Corinthians 13:9', '1 Corinthians 13:10', '1 Corinthians 13:11', '1 Corinthians 13:12', '1 Corinthians 13:13'] }
		];

		templateData.forEach(t => {
			const tBtn = templates.createEl('button', { text: t.name, cls: 'template-btn' });
			this.registerDomEvent(tBtn, 'click', async (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				const collection: Collection = {
					id: `col-${Date.now()}`,
					name: t.name,
					description: `Study the ${t.name}`,
					createdAt: Date.now(),
					verses: t.verses.map(v => ({ reference: v, completed: false }))
				};
				if (!this.plugin.settings.collections) {
					this.plugin.settings.collections = [];
				}
				this.plugin.settings.collections.push(collection);
				await this.plugin.saveSettings();
				await this.render();
				showToast(`Created "${t.name}" collection`);
			});
		});

		// Collections list
		const collectionsList = listPanel.createDiv({ cls: 'collections-list' });
		const collections = this.plugin.settings.collections;

		if (collections.length === 0) {
			collectionsList.createEl('p', { text: 'No collections yet. Create one or use a template above.', cls: 'empty-state' });
		} else {
			collections.forEach(col => {
				const completedCount = col.verses.filter(v => v.completed).length;
				const progress = col.verses.length > 0 ? Math.round((completedCount / col.verses.length) * 100) : 0;

				const isSelected = this.selectedCollectionId === col.id;
				const colItem = collectionsList.createDiv({ cls: `collection-item ${isSelected ? 'selected' : ''}` });
				colItem.createEl('strong', { text: col.name });
				colItem.createEl('span', { text: `${col.verses.length} verses • ${progress}% complete`, cls: 'collection-meta' });

				// Progress bar
				const progressBar = colItem.createDiv({ cls: 'collection-progress-bar' });
				const progressFill = progressBar.createDiv({ cls: 'collection-progress-fill' });
				progressFill.style.width = `${progress}%`;

				this.registerDomEvent(colItem, 'click', () => {
					this.selectedCollectionId = col.id;
					// Update selected state visually
					collectionsList.querySelectorAll('.collection-item').forEach(item => item.removeClass('selected'));
					colItem.addClass('selected');
					this.renderCollectionDetail(detailPanel, col);
				});
			});
		}

		// Default detail view - use selectedCollectionId if set, otherwise first collection
		if (collections.length > 0) {
			const selectedCol = this.selectedCollectionId
				? collections.find(c => c.id === this.selectedCollectionId)
				: collections[0];
			if (selectedCol) {
				if (!this.selectedCollectionId) {
					this.selectedCollectionId = selectedCol.id;
				}
				this.renderCollectionDetail(detailPanel, selectedCol);
			} else {
				// Selected collection was deleted, show first
				this.selectedCollectionId = collections[0].id;
				this.renderCollectionDetail(detailPanel, collections[0]);
			}
		} else {
			this.selectedCollectionId = null;
			detailPanel.createEl('p', { text: 'Select a collection to view details', cls: 'empty-state' });
		}
	}

	renderCollectionDetail(container: HTMLElement, collection: Collection) {
		container.empty();

		// Header with editable name
		const header = container.createDiv({ cls: 'collection-detail-header' });

		// Name input wrapper with edit icon
		const nameWrapper = header.createDiv({ cls: 'collection-name-wrapper' });
		const nameInput = nameWrapper.createEl('input', {
			type: 'text',
			value: collection.name,
			cls: 'collection-name-input',
			placeholder: 'Collection name...'
		});
		const editHint = nameWrapper.createSpan({ cls: 'collection-name-edit-hint' });
		setIcon(editHint, 'pencil');

		this.registerDomEvent(nameInput, 'change', async () => {
			collection.name = nameInput.value || 'Untitled collection';
			await this.plugin.saveSettings();
			await this.render();
		});

		// Focus the name input if this is a new collection with default name
		if (collection.name === 'New collection') {
			setTimeout(() => {
				nameInput.focus();
				nameInput.select();
			}, 100);
		}

		// Delete button
		const deleteBtn = header.createEl('button', { cls: 'collection-delete-btn' });
		const deleteIcon = deleteBtn.createSpan();
		setIcon(deleteIcon, 'trash-2');
		this.registerDomEvent(deleteBtn, 'click', async () => {
			const confirmed = await showConfirmModal(
				this.app,
				'Delete collection?',
				`Delete collection "${collection.name}"?`,
				{ confirmText: 'Delete', isDestructive: true }
			);
			if (confirmed) {
				const idx = this.plugin.settings.collections.findIndex(c => c.id === collection.id);
				if (idx !== -1) {
					this.plugin.settings.collections.splice(idx, 1);
					await this.plugin.saveSettings();
					showToast('Collection deleted');
					await this.render();
				}
			}
		});

		// Description
		const descInput = container.createEl('textarea', {
			cls: 'collection-desc-input',
			placeholder: 'Add a description...',
			attr: { rows: '2' }
		});
		descInput.value = collection.description || '';
		this.registerDomEvent(descInput, 'change', async () => {
			collection.description = descInput.value;
			await this.plugin.saveSettings();
		});

		// Progress summary
		const completedCount = collection.verses.filter(v => v.completed).length;
		const progress = collection.verses.length > 0 ? Math.round((completedCount / collection.verses.length) * 100) : 0;
		const progressDiv = container.createDiv({ cls: 'collection-progress-summary' });
		progressDiv.createEl('span', { text: `Progress: ${completedCount}/${collection.verses.length} verses (${progress}%)` });

		const progressBar = progressDiv.createDiv({ cls: 'collection-progress-bar large' });
		const progressFill = progressBar.createDiv({ cls: 'collection-progress-fill' });
		progressFill.style.width = `${progress}%`;

		// Add verse input
		const addSection = container.createDiv({ cls: 'collection-add-section' });
		addSection.createEl('label', { text: 'Add verses to this collection:', cls: 'collection-add-label' });
		const addRow = addSection.createDiv({ cls: 'collection-add-row' });
		const addInput = addRow.createEl('input', {
			type: 'text',
			placeholder: 'Enter verse reference (e.g., John 3:16, Romans 8:28)',
			cls: 'collection-add-input'
		});
		const addBtn = addRow.createEl('button', { cls: 'collection-add-btn' });
		const addBtnIcon = addBtn.createSpan({ cls: 'btn-icon' });
		setIcon(addBtnIcon, 'plus');
		addBtn.createSpan({ text: 'Add verse' });

		// Helper function to add verse
		const addVerse = async () => {
			const ref = addInput.value.trim();
			if (ref) {
				// Add verse to collection
				collection.verses.push({ reference: ref, completed: false });
				await this.plugin.saveSettings();
				showToast(`Added ${ref} to collection`);
				// Re-render entire view to update both list and detail panels
				await this.render();
			}
		};

		// Add on button click
		this.registerDomEvent(addBtn, 'click', addVerse);

		// Add on Enter key press
		this.registerDomEvent(addInput, 'keydown', async (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				await addVerse();
			}
		});

		// Verses list
		const versesList = container.createDiv({ cls: 'collection-verses-list' });
		collection.verses.forEach((verse, idx) => {
			const verseItem = versesList.createDiv({ cls: `collection-verse-item ${verse.completed ? 'completed' : ''}` });

			// Checkbox
			const checkbox = verseItem.createEl('input', { type: 'checkbox', cls: 'collection-verse-checkbox' });
			checkbox.checked = verse.completed;
			this.registerDomEvent(checkbox, 'change', async () => {
				verse.completed = checkbox.checked;
				await this.plugin.saveSettings();
				this.renderCollectionDetail(container, collection);
			});

			// Reference (clickable)
			const refSpan = verseItem.createEl('span', { text: verse.reference, cls: 'collection-verse-ref' });
			this.registerDomEvent(refSpan, 'click', () => {
				this.navigateToReference(verse.reference);
			});

			// Remove button
			const removeBtn = verseItem.createEl('button', { cls: 'collection-verse-remove' });
			const removeIcon = removeBtn.createSpan();
			setIcon(removeIcon, 'x');
			this.registerDomEvent(removeBtn, 'click', async () => {
				collection.verses.splice(idx, 1);
				await this.plugin.saveSettings();
				this.renderCollectionDetail(container, collection);
			});
		});

		// Export/Import buttons
		const exportSection = container.createDiv({ cls: 'collection-export-section' });
		const exportBtn = exportSection.createEl('button', { text: 'Export collection', cls: 'collection-export-btn' });
		this.registerDomEvent(exportBtn, 'click', async () => {
			const json = JSON.stringify(collection, null, 2);
			await navigator.clipboard.writeText(json);
			showToast('Collection exported to clipboard as JSON');
		});
	}

	// ========== MEMORIZATION MODE (15H) ==========
	renderMemorizationMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'memorization-header' });
		const h2 = header.createEl('h2');
		const titleIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'brain');
		h2.createSpan({ text: 'Scripture Memorization' });

		const verses = this.plugin.settings.memorizationVerses || [];
		const today = new Date().toISOString().split('T')[0];

		// Stats overview
		const statsSection = container.createDiv({ cls: 'memorization-stats' });
		const newCount = verses.filter(v => v.status === 'new').length;
		const learningCount = verses.filter(v => v.status === 'learning').length;
		const reviewingCount = verses.filter(v => v.status === 'reviewing').length;
		const masteredCount = verses.filter(v => v.status === 'mastered').length;
		const dueCount = verses.filter(v => v.nextReview <= today && v.status !== 'new').length;

		const statsGrid = statsSection.createDiv({ cls: 'memorization-stats-grid' });
		[
			{ label: 'New', value: newCount, icon: 'plus-circle', cls: 'stat-new' },
			{ label: 'Learning', value: learningCount, icon: 'loader', cls: 'stat-learning' },
			{ label: 'Reviewing', value: reviewingCount, icon: 'refresh-cw', cls: 'stat-reviewing' },
			{ label: 'Mastered', value: masteredCount, icon: 'check-circle', cls: 'stat-mastered' },
			{ label: 'Due today', value: dueCount, icon: 'clock', cls: 'stat-due' }
		].forEach(stat => {
			const card = statsGrid.createDiv({ cls: `memorization-stat-card ${stat.cls}` });
			const iconEl = card.createDiv({ cls: 'stat-icon' });
			setIcon(iconEl, stat.icon);
			card.createDiv({ text: stat.value.toString(), cls: 'stat-value' });
			card.createDiv({ text: stat.label, cls: 'stat-label' });
		});

		// Action buttons
		const actionsSection = container.createDiv({ cls: 'memorization-actions' });

		if (dueCount > 0 || newCount > 0) {
			const practiceBtn = actionsSection.createEl('button', { cls: 'memorization-practice-btn primary' });
			const practiceIcon = practiceBtn.createSpan({ cls: 'btn-icon' });
			setIcon(practiceIcon, 'play');
			practiceBtn.createSpan({ text: `Practice (${dueCount + Math.min(newCount, this.plugin.settings.memorizationSettings.newCardsPerDay)} cards)` });
			this.registerDomEvent(practiceBtn, 'click', () => {
				this.startMemorizationSession();
			});
		}

		const addBtn = actionsSection.createEl('button', { cls: 'memorization-add-btn' });
		const addIcon = addBtn.createSpan({ cls: 'btn-icon' });
		setIcon(addIcon, 'plus');
		addBtn.createSpan({ text: 'Add verse' });
		this.registerDomEvent(addBtn, 'click', () => {
			this.showAddMemorizationVerseModal();
		});

		// Verses list
		const versesSection = container.createDiv({ cls: 'memorization-verses-section' });
		versesSection.createEl('h3', { text: 'Your verses' });

		if (verses.length === 0) {
			const emptyState = versesSection.createDiv({ cls: 'memorization-empty' });
			const emptyIcon = emptyState.createDiv({ cls: 'empty-icon' });
			setIcon(emptyIcon, 'book-open');
			emptyState.createEl('p', { text: 'No verses added yet' });
			emptyState.createEl('p', { text: 'Add verses from any chapter view using the bookmark menu, or click "Add Verse" above.', cls: 'text-muted' });
		} else {
			// Group by status
			const groups = [
				{ status: 'new', label: 'New', verses: verses.filter(v => v.status === 'new') },
				{ status: 'learning', label: 'Learning', verses: verses.filter(v => v.status === 'learning') },
				{ status: 'reviewing', label: 'Reviewing', verses: verses.filter(v => v.status === 'reviewing') },
				{ status: 'mastered', label: 'Mastered', verses: verses.filter(v => v.status === 'mastered') }
			];

			groups.forEach(group => {
				if (group.verses.length === 0) return;

				const groupDiv = versesSection.createDiv({ cls: `memorization-group ${group.status}` });
				groupDiv.createEl('h4', { text: `${group.label} (${group.verses.length})` });

				const versesList = groupDiv.createDiv({ cls: 'memorization-verses-list' });
				group.verses.forEach(verse => {
					const verseCard = versesList.createDiv({ cls: 'memorization-verse-card' });

					const verseHeader = verseCard.createDiv({ cls: 'verse-card-header' });
					verseHeader.createSpan({ text: verse.reference, cls: 'verse-reference' });
					verseHeader.createSpan({ text: verse.version, cls: 'verse-version-badge' });

					const verseText = verseCard.createDiv({ cls: 'verse-text-preview' });
					verseText.setText(verse.text.length > 100 ? verse.text.slice(0, 100) + '...' : verse.text);

					const verseFooter = verseCard.createDiv({ cls: 'verse-card-footer' });
					if (verse.nextReview && verse.status !== 'new') {
						const nextReviewDate = new Date(verse.nextReview);
						const isOverdue = verse.nextReview < today;
						verseFooter.createSpan({
							text: isOverdue ? 'Due now' : `Next: ${nextReviewDate.toLocaleDateString()}`,
							cls: isOverdue ? 'next-review overdue' : 'next-review'
						});
					}
					verseFooter.createSpan({ text: `${verse.repetitions} reviews`, cls: 'review-count' });

					// Delete button
					const deleteBtn = verseCard.createEl('button', { cls: 'verse-delete-btn' });
					setIcon(deleteBtn, 'trash-2');
					this.registerDomEvent(deleteBtn, 'click', async (e) => {
						e.stopPropagation();
						const confirmed = await showConfirmModal(
							this.app,
							'Remove verse?',
							`Remove "${verse.reference}" from memorization?`,
							{ confirmText: 'Remove', isDestructive: true }
						);
						if (confirmed) {
							this.plugin.settings.memorizationVerses = verses.filter(v => v.reference !== verse.reference);
							await this.plugin.saveSettings();
							await this.render();
							showToast('Verse removed from memorization');
						}
					});
				});
			});
		}
	}

	startMemorizationSession() {
		const verses = this.plugin.settings.memorizationVerses || [];
		const today = new Date().toISOString().split('T')[0];
		const settings = this.plugin.settings.memorizationSettings;

		// Get due cards and new cards
		const dueCards = verses.filter(v => v.nextReview <= today && v.status !== 'new');
		const newCards = verses.filter(v => v.status === 'new').slice(0, settings.newCardsPerDay);
		const sessionCards = [...dueCards, ...newCards];

		if (sessionCards.length === 0) {
			showToast('No cards to review!');
			return;
		}

		// Shuffle cards
		for (let i = sessionCards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[sessionCards[i], sessionCards[j]] = [sessionCards[j], sessionCards[i]];
		}

		this.showFlashcardModal(sessionCards, 0);
	}

	showFlashcardModal(cards: MemorizationVerse[], index: number) {
		const card = cards[index];
		const modal = document.createElement('div');
		modal.className = 'flashcard-modal-overlay';

		const modalContent = document.createElement('div');
		modalContent.className = 'flashcard-modal';

		// Progress bar
		const progressDiv = document.createElement('div');
		progressDiv.className = 'flashcard-progress';
		const progressBar = document.createElement('div');
		progressBar.className = 'flashcard-progress-bar';
		progressBar.style.width = `${((index + 1) / cards.length) * 100}%`;
		progressDiv.appendChild(progressBar);
		const progressText = document.createElement('span');
		progressText.className = 'flashcard-progress-text';
		progressText.textContent = `${index + 1} / ${cards.length}`;
		progressDiv.appendChild(progressText);
		modalContent.appendChild(progressDiv);

		// Card container
		const cardContainer = document.createElement('div');
		cardContainer.className = 'flashcard-container';

		// Front (reference)
		const front = document.createElement('div');
		front.className = 'flashcard-front';
		const frontRef = document.createElement('div');
		frontRef.className = 'flashcard-reference';
		frontRef.textContent = card.reference;
		front.appendChild(frontRef);
		const frontInstruction = document.createElement('div');
		frontInstruction.className = 'flashcard-instruction';
		frontInstruction.textContent = 'Can you recite this verse?';
		front.appendChild(frontInstruction);
		const revealBtn = document.createElement('button');
		revealBtn.className = 'flashcard-reveal-btn';
		revealBtn.textContent = 'Show Answer';
		front.appendChild(revealBtn);
		cardContainer.appendChild(front);

		// Back (verse text with hint option)
		const back = document.createElement('div');
		back.className = 'flashcard-back hidden';

		const backRef = document.createElement('div');
		backRef.className = 'flashcard-reference';
		backRef.textContent = card.reference;
		back.appendChild(backRef);

		const hintText = this.plugin.settings.memorizationSettings.showHints
			? card.text.split(' ').map(w => w[0] + '_'.repeat(w.length - 1)).join(' ')
			: '';
		if (hintText) {
			const hintDiv = document.createElement('div');
			hintDiv.className = 'flashcard-hint';
			hintDiv.textContent = hintText;
			back.appendChild(hintDiv);
		}

		const verseTextDiv = document.createElement('div');
		verseTextDiv.className = 'flashcard-verse-text';
		verseTextDiv.textContent = card.text;
		back.appendChild(verseTextDiv);

		const versionDiv = document.createElement('div');
		versionDiv.className = 'flashcard-version';
		versionDiv.textContent = card.version;
		back.appendChild(versionDiv);

		const ratingDiv = document.createElement('div');
		ratingDiv.className = 'flashcard-rating';
		const ratingLabel = document.createElement('span');
		ratingLabel.className = 'rating-label';
		ratingLabel.textContent = 'How well did you remember?';
		ratingDiv.appendChild(ratingLabel);
		const ratingButtons = document.createElement('div');
		ratingButtons.className = 'rating-buttons';
		const ratings = [
			{ cls: 'forgot', rating: '0', text: 'Forgot' },
			{ cls: 'hard', rating: '1', text: 'Hard' },
			{ cls: 'good', rating: '2', text: 'Good' },
			{ cls: 'easy', rating: '3', text: 'Easy' }
		];
		ratings.forEach(r => {
			const btn = document.createElement('button');
			btn.className = `rating-btn ${r.cls}`;
			btn.setAttribute('data-rating', r.rating);
			btn.textContent = r.text;
			ratingButtons.appendChild(btn);
		});
		ratingDiv.appendChild(ratingButtons);
		back.appendChild(ratingDiv);

		cardContainer.appendChild(back);

		modalContent.appendChild(cardContainer);

		// Close button
		const closeBtn = document.createElement('button');
		closeBtn.className = 'flashcard-close-btn';
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => modal.remove());
		modalContent.appendChild(closeBtn);

		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		// Event handlers
		revealBtn.addEventListener('click', () => {
			front.classList.add('hidden');
			back.classList.remove('hidden');
		});

		const ratingBtns = back.querySelectorAll('.rating-btn');
		ratingBtns.forEach(btn => {
			btn.addEventListener('click', async () => {
				const rating = parseInt(btn.getAttribute('data-rating') || '0');
				await this.processMemorizationRating(card, rating);

				if (index + 1 < cards.length) {
					modal.remove();
					this.showFlashcardModal(cards, index + 1);
				} else {
					modal.remove();
					showToast(`Session complete! ${cards.length} cards reviewed.`);
					await this.render();
				}
			});
		});
	}

	async processMemorizationRating(card: MemorizationVerse, rating: number) {
		// SM-2 Algorithm implementation
		const verses = this.plugin.settings.memorizationVerses;
		const verseIndex = verses.findIndex(v => v.reference === card.reference);
		if (verseIndex === -1) return;

		const verse = verses[verseIndex];
		const today = new Date();

		if (rating < 2) {
			// Failed - reset to learning
			verse.repetitions = 0;
			verse.interval = 1;
			verse.status = 'learning';
		} else {
			// Success
			if (verse.repetitions === 0) {
				verse.interval = 1;
			} else if (verse.repetitions === 1) {
				verse.interval = 6;
			} else {
				verse.interval = Math.round(verse.interval * verse.easeFactor);
			}

			verse.repetitions++;

			// Update ease factor (min 1.3)
			verse.easeFactor = Math.max(1.3, verse.easeFactor + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02)));

			// Update status based on interval
			if (verse.interval >= 21) {
				verse.status = 'mastered';
			} else if (verse.interval >= 7) {
				verse.status = 'reviewing';
			} else {
				verse.status = 'learning';
			}
		}

		// Set next review date
		const nextReview = new Date(today);
		nextReview.setDate(nextReview.getDate() + verse.interval);
		verse.nextReview = nextReview.toISOString().split('T')[0];
		verse.lastReview = today.toISOString().split('T')[0];

		await this.plugin.saveSettings();
	}

	showAddMemorizationVerseModal() {
		const modal = document.createElement('div');
		modal.className = 'add-memorization-modal-overlay';

		const modalContent = document.createElement('div');
		modalContent.className = 'add-memorization-modal';

		// Build the modal content with DOM APIs
		const title = document.createElement('h3');
		title.textContent = 'Add verse to memorize';
		modalContent.appendChild(title);

		const form = document.createElement('div');
		form.className = 'add-verse-form';

		// Reference input group
		const refGroup = document.createElement('div');
		refGroup.className = 'form-group';
		const refLabel = document.createElement('label');
		refLabel.textContent = 'Reference (e.g., John 3:16)';
		refGroup.appendChild(refLabel);
		const refInput = document.createElement('input');
		refInput.type = 'text';
		refInput.className = 'verse-reference-input';
		refInput.placeholder = 'John 3:16';
		refGroup.appendChild(refInput);
		form.appendChild(refGroup);

		// Version select group
		const versionGroup = document.createElement('div');
		versionGroup.className = 'form-group';
		const versionLabel = document.createElement('label');
		versionLabel.textContent = 'Version';
		versionGroup.appendChild(versionLabel);
		const versionSelect = document.createElement('select');
		versionSelect.className = 'verse-version-select';
		this.plugin.settings.bibleVersions.forEach(v => {
			const option = document.createElement('option');
			option.value = v;
			option.textContent = v;
			versionSelect.appendChild(option);
		});
		versionGroup.appendChild(versionSelect);
		form.appendChild(versionGroup);

		// Text input group
		const textGroup = document.createElement('div');
		textGroup.className = 'form-group';
		const textLabel = document.createElement('label');
		textLabel.textContent = 'Verse text (auto-fills if found)';
		textGroup.appendChild(textLabel);
		const textInput = document.createElement('textarea');
		textInput.className = 'verse-text-input';
		textInput.rows = 4;
		textInput.placeholder = 'Enter verse text...';
		textGroup.appendChild(textInput);
		form.appendChild(textGroup);

		// Action buttons
		const actions = document.createElement('div');
		actions.className = 'form-actions';
		const cancelBtn = document.createElement('button');
		cancelBtn.className = 'cancel-btn';
		cancelBtn.textContent = 'Cancel';
		actions.appendChild(cancelBtn);
		const lookupBtn = document.createElement('button');
		lookupBtn.className = 'lookup-btn';
		lookupBtn.textContent = 'Lookup';
		actions.appendChild(lookupBtn);
		const addBtn = document.createElement('button');
		addBtn.className = 'add-btn primary';
		addBtn.textContent = 'Add verse';
		actions.appendChild(addBtn);
		form.appendChild(actions);

		modalContent.appendChild(form);

		const closeBtn = document.createElement('button');
		closeBtn.className = 'modal-close-btn';
		closeBtn.textContent = '×';
		closeBtn.addEventListener('click', () => modal.remove());
		modalContent.appendChild(closeBtn);

		modal.appendChild(modalContent);
		document.body.appendChild(modal);

		// Event handlers
		cancelBtn.addEventListener('click', () => modal.remove());

		lookupBtn.addEventListener('click', () => {
			const ref = refInput.value.trim();
			const version = versionSelect.value;

			// Parse reference like "John 3:16" or "Genesis 1:1"
			const match = ref.match(/^(.+?)\s+(\d+):(\d+)$/);
			if (match) {
				const book = match[1].trim();
				const chapter = parseInt(match[2]);
				const verse = parseInt(match[3]);

				const chapterData = this.plugin.getChapter(version, book, chapter);
				if (chapterData && chapterData.verses[verse]) {
					const verseData = chapterData.verses[verse];
					textInput.value = typeof verseData === 'string' ? verseData : verseData.text;
					showToast('Verse found!');
				} else {
					showToast('Verse not found');
				}
			} else {
				showToast('Invalid reference format. Use "Book Chapter:Verse" (e.g., John 3:16)');
			}
		});

		addBtn.addEventListener('click', async () => {
			const reference = refInput.value.trim();
			const version = versionSelect.value;
			const text = textInput.value.trim();

			if (!reference || !text) {
				showToast('Please enter reference and verse text');
				return;
			}

			// Check if already exists
			if (this.plugin.settings.memorizationVerses.some(v => v.reference === reference)) {
				showToast('This verse is already in your memorization list');
				return;
			}

			const newVerse: MemorizationVerse = {
				reference,
				text,
				version,
				easeFactor: 2.5,
				interval: 0,
				repetitions: 0,
				nextReview: new Date().toISOString().split('T')[0],
				lastReview: '',
				status: 'new',
				createdDate: new Date().toISOString()
			};

			this.plugin.settings.memorizationVerses.push(newVerse);
			await this.plugin.saveSettings();
			modal.remove();
			await this.render();
			showToast(`Added "${reference}" to memorization`);
		});
	}

	// ========== CONTEXT SIDEBAR (15C) ==========
	renderContextSidebar(container: HTMLElement) {
		// Header with close button
		const header = container.createDiv({ cls: 'context-sidebar-header' });
		const titleDiv = header.createDiv({ cls: 'context-sidebar-title' });
		const titleIcon = titleDiv.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'book-marked');
		titleDiv.createSpan({ text: 'Study context' });

		const closeBtn = header.createEl('button', { cls: 'context-sidebar-close' });
		setIcon(closeBtn, 'x');
		this.registerDomEvent(closeBtn, 'click', async () => {
			this.plugin.settings.showContextSidebar = false;
			await this.plugin.saveSettings();
			await this.render();
		});

		// Tab bar
		const tabBar = container.createDiv({ cls: 'context-sidebar-tabs' });
		const tabs: { id: 'commentary' | 'word-study' | 'context' | 'parallels' | 'notes'; label: string; icon: string }[] = [
			{ id: 'commentary', label: 'Commentary', icon: 'book-open' },
			{ id: 'word-study', label: 'Words', icon: 'languages' },
			{ id: 'context', label: 'Context', icon: 'map-pin' },
			{ id: 'parallels', label: 'Cross-Refs', icon: 'git-compare' },
			{ id: 'notes', label: 'Notes', icon: 'file-text' }
		];

		tabs.forEach(tab => {
			const tabBtn = tabBar.createEl('button', {
				cls: `context-tab ${this.plugin.settings.contextSidebarTab === tab.id ? 'active' : ''}`
			});
			const tabIcon = tabBtn.createSpan({ cls: 'tab-icon' });
			setIcon(tabIcon, tab.icon);
			tabBtn.createSpan({ text: tab.label, cls: 'tab-label' });

			this.registerDomEvent(tabBtn, 'click', async () => {
				this.plugin.settings.contextSidebarTab = tab.id;
				await this.plugin.saveSettings();
				this.renderContextSidebarContent(contentArea);
				// Update active tab styling
				tabBar.querySelectorAll('.context-tab').forEach(t => t.removeClass('active'));
				tabBtn.addClass('active');
			});
		});

		// Content area
		const contentArea = container.createDiv({ cls: 'context-sidebar-content' });
		this.renderContextSidebarContent(contentArea);
	}

	renderContextSidebarContent(container: HTMLElement) {
		container.empty();

		const currentRef = `${this.currentBook} ${this.currentChapter}`;
		const tab = this.plugin.settings.contextSidebarTab;

		if (tab === 'commentary') {
			this.renderCommentaryTab(container, currentRef);
		} else if (tab === 'word-study') {
			this.renderWordStudyTab(container, currentRef);
		} else if (tab === 'context') {
			this.renderContextTab(container, currentRef);
		} else if (tab === 'parallels') {
			this.renderParallelsTab(container, currentRef);
		} else if (tab === 'notes') {
			this.renderNotesTab(container, currentRef);
		}
	}

	renderCommentaryTab(container: HTMLElement, reference: string) {
		// Check if commentary data is available
		const chapterCommentary = this.plugin.getCommentaryForChapter(this.currentBook, this.currentChapter);

		if (!this.plugin.commentaryData) {
			// No commentary data loaded - show download option
			const placeholder = container.createDiv({ cls: 'context-placeholder' });
			const icon = placeholder.createSpan({ cls: 'placeholder-icon' });
			setIcon(icon, 'book-open');
			placeholder.createEl('h3', { text: 'Commentary' });
			placeholder.createEl('p', { text: 'No commentary data installed yet.' });

			placeholder.createEl('p', {
				text: 'Download Matthew Henry\'s Concise Commentary (Public Domain, ~3.6 MB)',
				cls: 'text-muted'
			});

			const downloadBtn = placeholder.createEl('button', {
				text: 'Download commentary',
				cls: 'mod-cta'
			});
			downloadBtn.addEventListener('click', async () => {
				downloadBtn.disabled = true;
				downloadBtn.textContent = 'Downloading...';
				await this.plugin.downloadCommentaryData();
				// Refresh the view after download
				if (this.plugin.commentaryData) {
					container.empty();
					this.renderContextSidebar(container);
				} else {
					downloadBtn.disabled = false;
					downloadBtn.textContent = 'Download commentary';
				}
			});

			return;
		}

		if (!chapterCommentary) {
			// Commentary data loaded but nothing for this chapter
			const placeholder = container.createDiv({ cls: 'context-placeholder' });
			const icon = placeholder.createSpan({ cls: 'placeholder-icon' });
			setIcon(icon, 'book-open');
			placeholder.createEl('h3', { text: 'Commentary' });
			placeholder.createEl('p', { text: `No commentary available for ${reference}.` });
			return;
		}

		// Display commentary header
		const header = container.createDiv({ cls: 'commentary-header' });
		const titleRow = header.createDiv({ cls: 'commentary-title-row' });
		const titleIcon = titleRow.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'book-open');
		titleRow.createEl('h3', { text: reference });

		// Show source metadata
		if (this.plugin.commentaryMetadata) {
			header.createEl('p', {
				text: `${this.plugin.commentaryMetadata.author || 'Matthew Henry'} (${this.plugin.commentaryMetadata.year || '1706'})`,
				cls: 'commentary-source'
			});
		}

		// Commentary sections container
		const sectionsContainer = container.createDiv({ cls: 'commentary-sections' });

		// Sort verse ranges numerically
		const sortedRanges = Object.keys(chapterCommentary).sort((a, b) => {
			const aNum = parseInt(a.split('-')[0].split(',')[0]) || 0;
			const bNum = parseInt(b.split('-')[0].split(',')[0]) || 0;
			return aNum - bNum;
		});

		for (const verseRange of sortedRanges) {
			const commentary = chapterCommentary[verseRange];
			if (!commentary) continue;

			const section = sectionsContainer.createDiv({ cls: 'commentary-section' });

			// Verse range header
			const rangeHeader = section.createDiv({ cls: 'verse-range-header' });
			if (verseRange !== 'intro') {
				rangeHeader.createSpan({ text: `Verses ${verseRange}`, cls: 'verse-range' });
			} else {
				rangeHeader.createSpan({ text: 'Introduction', cls: 'verse-range' });
			}

			// Commentary text
			const textDiv = section.createDiv({ cls: 'commentary-text' });

			// Split into paragraphs for readability
			const paragraphs = commentary.split(/(?<=[.!?])\s+(?=[A-Z])/);
			for (const para of paragraphs) {
				if (para.trim()) {
					textDiv.createEl('p', { text: para.trim() });
				}
			}
		}

		// If no sections were rendered
		if (sectionsContainer.children.length === 0) {
			sectionsContainer.createEl('p', {
				text: 'No commentary sections found for this chapter.',
				cls: 'text-muted'
			});
		}
	}

	renderWordStudyTab(container: HTMLElement, reference: string) {
		// Check if Strong's data is available
		if (!this.plugin.strongsDictionary) {
			const placeholder = container.createDiv({ cls: 'context-placeholder' });
			const icon = placeholder.createSpan({ cls: 'placeholder-icon' });
			setIcon(icon, 'languages');
			placeholder.createEl('h3', { text: 'Word studies' });
			placeholder.createEl('p', { text: 'Strong\'s data not downloaded.' });
			placeholder.createEl('p', { text: 'Download to enable Greek & Hebrew word studies with clickable words.', cls: 'text-muted' });

			const downloadBtn = placeholder.createEl('button', {
				text: 'Download Strong\'s & Interlinear',
				cls: 'sidebar-download-btn'
			});
			this.registerDomEvent(downloadBtn, 'click', async () => {
				downloadBtn.disabled = true;
				downloadBtn.textContent = 'Downloading...';
				await this.plugin.downloadStrongsDictionaries();
				await this.render();
			});
			return;
		}

		// Header
		const header = container.createDiv({ cls: 'word-study-header' });
		const titleRow = header.createDiv({ cls: 'word-study-title-row' });
		const titleIcon = titleRow.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'languages');
		titleRow.createEl('h3', { text: reference });

		// Show selected word prominently if one is selected
		if (this.selectedStrongsWord) {
			const selectedSection = container.createDiv({ cls: 'selected-word-section' });

			const sectionHeader = selectedSection.createDiv({ cls: 'section-header' });
			const headerIcon = sectionHeader.createSpan({ cls: 'section-icon' });
			setIcon(headerIcon, 'target');
			sectionHeader.createSpan({ text: 'Selected word' });

			// Clear button
			const clearBtn = sectionHeader.createEl('button', { cls: 'clear-selection-btn', text: '✕' });
			this.registerDomEvent(clearBtn, 'click', () => {
				this.selectedStrongsWord = null;
				this.renderContextSidebarContent(container.parentElement as HTMLElement);
			});

			const entry = this.plugin.getStrongsDefinition(this.selectedStrongsWord);
			if (entry) {
				const selectedCard = selectedSection.createDiv({ cls: 'word-study-card selected-word-card' });
				const wordHeader = selectedCard.createDiv({ cls: 'word-card-header' });

				// Strong's number badge
				const numBadge = wordHeader.createSpan({ text: this.selectedStrongsWord, cls: 'strongs-number-badge' });
				numBadge.addClass(this.selectedStrongsWord.startsWith('H') ? 'hebrew' : 'greek');

				// Lemma (original language word)
				wordHeader.createSpan({ text: entry.lemma || '', cls: 'word-lemma large' });

				// Transliteration
				const translit = this.selectedStrongsWord.startsWith('H')
					? (entry as StrongsHebrewEntry).xlit
					: (entry as StrongsGreekEntry).translit;
				if (translit) {
					wordHeader.createSpan({ text: `(${translit})`, cls: 'word-translit' });
				}

				// Definition
				const def = entry.strongs_def || entry.kjv_def || '';
				selectedCard.createEl('p', { text: def, cls: 'word-definition' });

				// Derivation if available
				if (entry.derivation) {
					const derivDiv = selectedCard.createDiv({ cls: 'word-derivation' });
					derivDiv.createEl('strong', { text: 'Derivation: ' });
					derivDiv.appendText(entry.derivation);
				}

				// KJV definition if different from Strong's
				if (entry.kjv_def && entry.strongs_def && entry.kjv_def !== entry.strongs_def) {
					const kjvDiv = selectedCard.createDiv({ cls: 'word-kjv-def' });
					kjvDiv.createEl('strong', { text: 'KJV usage: ' });
					kjvDiv.appendText(entry.kjv_def);
				}

				// View in Strong's Lookup button
				const lookupBtn = selectedCard.createEl('button', {
					text: 'View in Strong\'s Lookup →',
					cls: 'view-in-lookup-btn'
				});
				this.registerDomEvent(lookupBtn, 'click', () => {
					this.strongsLookupInput = this.selectedStrongsWord!;
					this.viewMode = ViewMode.STRONGS;
					void this.render();
				});
			}
		} else {
			// No word selected - show hint
			header.createEl('p', { text: 'Click any highlighted word in the text to see its definition.', cls: 'text-muted word-study-hint' });
		}

		// Gather chapter key words from the current chapter
		const chapterWords: Map<string, { count: number; word: string }> = new Map();
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);

		if (chapter) {
			for (const [verseNum, verseData] of Object.entries(chapter.verses)) {
				if (typeof verseData !== 'string' && verseData.strongs) {
					for (const sw of verseData.strongs) {
						if (sw.number) {
							const existing = chapterWords.get(sw.number);
							if (existing) {
								existing.count++;
							} else {
								chapterWords.set(sw.number, { count: 1, word: sw.word || '' });
							}
						}
					}
				}
			}
		}

		// Show chapter key words
		const wordsContainer = container.createDiv({ cls: 'word-study-samples' });

		if (chapterWords.size > 0) {
			const sectionHeader = wordsContainer.createDiv({ cls: 'section-header' });
			const headerIcon = sectionHeader.createSpan({ cls: 'section-icon' });
			setIcon(headerIcon, 'book-open');
			sectionHeader.createSpan({ text: `Key Words in ${this.currentBook} ${this.currentChapter}` });

			// Sort by frequency
			const sortedWords = Array.from(chapterWords.entries())
				.sort((a, b) => b[1].count - a[1].count)
				.slice(0, 12); // Show top 12

			for (const [strongsNum, data] of sortedWords) {
				// Skip the selected word - already shown above
				if (strongsNum === this.selectedStrongsWord) continue;

				const entry = this.plugin.getStrongsDefinition(strongsNum);
				if (entry) {
					const wordCard = wordsContainer.createDiv({ cls: 'word-study-card compact' });
					wordCard.style.cursor = 'pointer';

					const wordHeader = wordCard.createDiv({ cls: 'word-card-header' });

					// Strong's number
					const numSpan = wordHeader.createSpan({ text: strongsNum, cls: 'strongs-number' });
					numSpan.addClass(strongsNum.startsWith('H') ? 'hebrew' : 'greek');

					// Lemma
					wordHeader.createSpan({ text: entry.lemma || '', cls: 'word-lemma' });

					// Count badge
					if (data.count > 1) {
						wordHeader.createSpan({ text: `×${data.count}`, cls: 'word-count-badge' });
					}

					// Short definition
					const def = entry.strongs_def || entry.kjv_def || '';
					const shortDef = def.length > 60 ? def.slice(0, 60) + '...' : def;
					wordCard.createEl('p', { text: shortDef, cls: 'word-definition compact' });

					// Click to view in Strong's Lookup
					this.registerDomEvent(wordCard, 'click', () => {
						this.strongsLookupInput = strongsNum;
						this.viewMode = ViewMode.STRONGS;
						void this.render();
					});
				}
			}
		} else {
			// No Strong's data for this chapter - show featured words as fallback
			wordsContainer.createEl('h4', { text: 'Featured Greek Words' });

			const greekSamples = ['G26', 'G4102', 'G5485', 'G2316', 'G3056'];
			for (const strongsNum of greekSamples) {
				const entry = this.plugin.strongsDictionary.greek?.[strongsNum];
				if (entry) {
					const wordCard = wordsContainer.createDiv({ cls: 'word-study-card' });
					wordCard.style.cursor = 'pointer';
					const wordHeader = wordCard.createDiv({ cls: 'word-card-header' });
					wordHeader.createSpan({ text: strongsNum, cls: 'strongs-number' });
					wordHeader.createSpan({ text: entry.lemma || '', cls: 'word-lemma' });
					if (entry.translit) {
						wordHeader.createSpan({ text: `(${entry.translit})`, cls: 'word-translit' });
					}
					wordCard.createEl('p', { text: entry.strongs_def || entry.kjv_def || '', cls: 'word-definition' });

					// Click to view in Strong's Lookup
					this.registerDomEvent(wordCard, 'click', () => {
						this.strongsLookupInput = strongsNum;
						this.viewMode = ViewMode.STRONGS;
						void this.render();
					});
				}
			}

			wordsContainer.createEl('h4', { text: 'Featured Hebrew Words', cls: 'hebrew-section' });

			const hebrewSamples = ['H430', 'H3068', 'H2617', 'H7965', 'H539'];
			for (const strongsNum of hebrewSamples) {
				const entry = this.plugin.strongsDictionary.hebrew?.[strongsNum];
				if (entry) {
					const wordCard = wordsContainer.createDiv({ cls: 'word-study-card' });
					wordCard.style.cursor = 'pointer';
					const wordHeader = wordCard.createDiv({ cls: 'word-card-header' });
					wordHeader.createSpan({ text: strongsNum, cls: 'strongs-number' });
					wordHeader.createSpan({ text: entry.lemma || '', cls: 'word-lemma' });
					if (entry.xlit) {
						wordHeader.createSpan({ text: `(${entry.xlit})`, cls: 'word-translit' });
					}
					wordCard.createEl('p', { text: entry.strongs_def || entry.kjv_def || '', cls: 'word-definition' });

					// Click to view in Strong's Lookup
					this.registerDomEvent(wordCard, 'click', () => {
						this.strongsLookupInput = strongsNum;
						this.viewMode = ViewMode.STRONGS;
						void this.render();
					});
				}
			}
		}
	}

	renderContextTab(container: HTMLElement, reference: string) {
		// Check if Theographic data is available
		if (!this.plugin.theographicData.loaded) {
			const placeholder = container.createDiv({ cls: 'context-placeholder' });
			const icon = placeholder.createSpan({ cls: 'placeholder-icon' });
			setIcon(icon, 'map-pin');
			placeholder.createEl('h3', { text: 'Historical context' });
			placeholder.createEl('p', { text: 'Theographic metadata not downloaded.' });
			placeholder.createEl('p', { text: 'Download to see people, places, and events mentioned in Scripture.', cls: 'text-muted' });

			const downloadBtn = placeholder.createEl('button', {
				text: 'Download Theographic',
				cls: 'sidebar-download-btn'
			});
			this.registerDomEvent(downloadBtn, 'click', async () => {
				downloadBtn.disabled = true;
				downloadBtn.textContent = 'Downloading...';
				await this.plugin.downloadTheographicData();
				await this.render();
			});
			return;
		}

		// Header
		const header = container.createDiv({ cls: 'context-header' });
		const titleRow = header.createDiv({ cls: 'context-title-row' });
		const titleIcon = titleRow.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'map-pin');
		titleRow.createEl('h3', { text: reference });

		// Gather people, places, and events for this chapter (store full objects for click handling)
		const bookPeople: Map<string, TheographicPerson> = new Map();
		const bookPlaces: Map<string, TheographicPlace> = new Map();
		const bookEvents: Map<string, TheographicEvent> = new Map();

		// Get chapter data to know how many verses
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);
		if (chapter) {
			const verseCount = Object.keys(chapter.verses).length;
			for (let v = 1; v <= verseCount; v++) {
				// Use colon-separated format to match Theographic index: "Genesis:1:1"
				const verseRef = `${this.currentBook}:${this.currentChapter}:${v}`;

				// Get people - use Map.get()
				const people = this.plugin.theographicData.peopleByVerse?.get(verseRef);
				if (people) {
					people.forEach((person: TheographicPerson) => {
						if (person?.fields?.name) bookPeople.set(person.id, person);
					});
				}

				// Get places - use Map.get()
				const places = this.plugin.theographicData.placesByVerse?.get(verseRef);
				if (places) {
					places.forEach((place: TheographicPlace) => {
						if (place?.fields?.displayTitle) bookPlaces.set(place.id, place);
					});
				}

				// Get events - use Map.get()
				const events = this.plugin.theographicData.eventsByVerse?.get(verseRef);
				if (events) {
					events.forEach((event: TheographicEvent) => {
						if (event?.fields?.title) bookEvents.set(event.id, event);
					});
				}
			}
		}

		// People section
		const peopleSection = container.createDiv({ cls: 'context-section' });
		const peopleHeader = peopleSection.createDiv({ cls: 'section-header' });
		const peopleIcon = peopleHeader.createSpan({ cls: 'section-icon' });
		setIcon(peopleIcon, 'users');
		peopleHeader.createSpan({ text: `People (${bookPeople.size})` });

		if (bookPeople.size > 0) {
			const peopleList = peopleSection.createDiv({ cls: 'context-tags' });
			// Sort by display name
			const sortedPeople = Array.from(bookPeople.values()).sort((a, b) => {
				const nameA = a.fields?.displayTitle || a.fields?.name || '';
				const nameB = b.fields?.displayTitle || b.fields?.name || '';
				return nameA.localeCompare(nameB);
			});
			sortedPeople.forEach(person => {
				const name = person.fields?.displayTitle || person.fields?.name || 'Unknown';
				const tag = peopleList.createSpan({ text: name, cls: 'context-tag person-tag clickable' });
				this.registerDomEvent(tag, 'click', () => {
					new TheographicDetailModal(this.plugin.app, 'person', person, this.plugin, this).open();
				});
			});
		} else {
			peopleSection.createEl('p', { text: 'No people identified in this chapter.', cls: 'text-muted' });
		}

		// Places section
		const placesSection = container.createDiv({ cls: 'context-section' });
		const placesHeader = placesSection.createDiv({ cls: 'section-header' });
		const placesIcon = placesHeader.createSpan({ cls: 'section-icon' });
		setIcon(placesIcon, 'map-pin');
		placesHeader.createSpan({ text: `Places (${bookPlaces.size})` });

		if (bookPlaces.size > 0) {
			const placesList = placesSection.createDiv({ cls: 'context-tags' });
			// Sort by display title
			const sortedPlaces = Array.from(bookPlaces.values()).sort((a, b) => {
				const nameA = a.fields?.displayTitle || '';
				const nameB = b.fields?.displayTitle || '';
				return nameA.localeCompare(nameB);
			});
			sortedPlaces.forEach(place => {
				const name = place.fields?.displayTitle || 'Unknown';
				const tag = placesList.createSpan({ text: name, cls: 'context-tag place-tag clickable' });
				this.registerDomEvent(tag, 'click', () => {
					new TheographicDetailModal(this.plugin.app, 'place', place, this.plugin, this).open();
				});
			});
		} else {
			placesSection.createEl('p', { text: 'No places identified in this chapter.', cls: 'text-muted' });
		}

		// Events section
		if (this.plugin.settings.theographicShowEvents) {
			const eventsSection = container.createDiv({ cls: 'context-section' });
			const eventsHeader = eventsSection.createDiv({ cls: 'section-header' });
			const eventsIcon = eventsHeader.createSpan({ cls: 'section-icon' });
			setIcon(eventsIcon, 'calendar');
			eventsHeader.createSpan({ text: `Events (${bookEvents.size})` });

			if (bookEvents.size > 0) {
				const eventsList = eventsSection.createDiv({ cls: 'context-events' });
				Array.from(bookEvents.values()).forEach(event => {
					const eventItem = eventsList.createDiv({ cls: 'context-event-item clickable' });
					const eventTitle = eventItem.createDiv({ cls: 'event-title' });
					eventTitle.createSpan({ text: event.fields?.title || 'Unknown event' });

					// Show date if available
					if (event.fields?.startDate) {
						// Format year - negative numbers are BCE
						const year = parseInt(event.fields.startDate);
						const dateStr = year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
						eventItem.createDiv({ text: dateStr, cls: 'event-date' });
					}

					// Show duration if available
					if (event.fields?.duration) {
						eventItem.createDiv({ text: `Duration: ${event.fields.duration}`, cls: 'event-duration' });
					}

					// Click to open detail modal
					this.registerDomEvent(eventItem, 'click', () => {
						new TheographicDetailModal(this.plugin.app, 'event', event, this.plugin, this).open();
					});
				});
			} else {
				eventsSection.createEl('p', { text: 'No events identified in this chapter.', cls: 'text-muted' });
			}
		}
	}

	renderParallelsTab(container: HTMLElement, reference: string) {
		// Check if cross-references are available
		if (!this.plugin.crossReferences) {
			const placeholder = container.createDiv({ cls: 'context-placeholder' });
			const icon = placeholder.createSpan({ cls: 'placeholder-icon' });
			setIcon(icon, 'git-compare');
			placeholder.createEl('h3', { text: 'Parallel passages' });
			placeholder.createEl('p', { text: 'Cross-references not downloaded.' });
			placeholder.createEl('p', { text: 'Download to see related Scripture passages.', cls: 'text-muted' });

			const downloadBtn = placeholder.createEl('button', {
				text: 'Download cross-references',
				cls: 'sidebar-download-btn'
			});
			this.registerDomEvent(downloadBtn, 'click', async () => {
				downloadBtn.disabled = true;
				downloadBtn.textContent = 'Downloading...';
				await this.plugin.downloadCrossReferences();
				await this.render();
			});
			return;
		}

		// Header
		const header = container.createDiv({ cls: 'parallels-header' });
		const titleRow = header.createDiv({ cls: 'parallels-title-row' });
		const titleIcon = titleRow.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'git-compare');
		titleRow.createEl('h3', { text: reference });

		// Gather cross-references for this chapter
		const chapterRefs: { verse: number; refs: string[] }[] = [];
		const chapter = this.plugin.getChapter(this.currentVersion, this.currentBook, this.currentChapter);

		if (chapter) {
			const verseCount = Object.keys(chapter.verses).length;
			for (let v = 1; v <= verseCount; v++) {
				const refs = this.plugin.getCrossReferences(this.currentBook, this.currentChapter, v);
				if (refs.length > 0) {
					chapterRefs.push({ verse: v, refs: refs.slice(0, 5) }); // Limit to 5 refs per verse
				}
			}
		}

		// Summary
		const summary = container.createDiv({ cls: 'parallels-summary' });
		const totalRefs = chapterRefs.reduce((sum, v) => sum + v.refs.length, 0);
		summary.createEl('p', {
			text: `${chapterRefs.length} verses with ${totalRefs} cross-references`,
			cls: 'parallels-count'
		});

		// Cross-references list
		const refsList = container.createDiv({ cls: 'parallels-list' });

		if (chapterRefs.length === 0) {
			refsList.createEl('p', { text: 'No cross-references found for this chapter.', cls: 'text-muted' });
		} else {
			// Show first 10 verses with refs
			for (const { verse, refs } of chapterRefs.slice(0, 10)) {
				const verseSection = refsList.createDiv({ cls: 'parallel-verse-section' });
				verseSection.createEl('div', { text: `Verse ${verse}`, cls: 'parallel-verse-num' });

				const refsDiv = verseSection.createDiv({ cls: 'parallel-refs' });
				for (const ref of refs) {
					const refLink = refsDiv.createEl('button', { text: ref, cls: 'parallel-ref-link' });
					this.registerDomEvent(refLink, 'click', () => {
						// Navigate to the cross-reference
						const match = ref.match(/^(.+)\s+(\d+):(\d+)$/);
						if (match) {
							this.currentBook = match[1];
							this.currentChapter = parseInt(match[2]);
							this.selectedVerseStart = parseInt(match[3]);
							this.viewMode = ViewMode.CHAPTER;
							void this.render();
						}
					});
				}
			}

			if (chapterRefs.length > 10) {
				refsList.createEl('p', {
					text: `...and ${chapterRefs.length - 10} more verses with cross-references`,
					cls: 'text-muted'
				});
			}
		}
	}

	renderNotesTab(container: HTMLElement, reference: string) {
		// Header
		const header = container.createDiv({ cls: 'notes-tab-header' });
		const titleRow = header.createDiv({ cls: 'notes-title-row' });
		const titleIcon = titleRow.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'file-text');
		titleRow.createEl('h3', { text: reference });

		// Get notes for current chapter
		const chapterNotes: { path: string; level: string; verse?: number; endVerse?: number }[] = [];

		// Check all notes for this chapter
		const noteFiles = this.plugin.app.vault.getMarkdownFiles();
		const notesDir = this.plugin.settings.notesFolder;

		for (const file of noteFiles) {
			if (!file.path.startsWith(notesDir)) continue;

			const content = this.plugin.app.metadataCache.getFileCache(file);
			if (!content?.frontmatter) continue;

			const fm = content.frontmatter;
			if (fm.book === this.currentBook && fm.chapter === this.currentChapter) {
				chapterNotes.push({
					path: file.path,
					level: fm.level || 'verse',
					verse: fm.verse,
					endVerse: fm.endVerse
				});
			}
		}

		// Summary bar with count and new note button
		const summary = container.createDiv({ cls: 'notes-tab-summary' });
		summary.createEl('span', {
			text: `${chapterNotes.length} note${chapterNotes.length !== 1 ? 's' : ''} in this chapter`,
			cls: 'notes-count'
		});

		// Create new note button
		const createBtn = summary.createEl('button', { cls: 'notes-tab-create-btn' });
		const createIcon = createBtn.createSpan({ cls: 'btn-icon' });
		setIcon(createIcon, 'plus');
		createBtn.createSpan({ text: 'New note' });
		this.registerDomEvent(createBtn, 'click', () => {
			// Create note for selected verse or verse 1
			const targetVerse = this.selectedVerseStart || 1;
			this.createNoteForVerse(this.currentBook, this.currentChapter, targetVerse);
		});

		// Preview panel (shows selected note content) - at the TOP
		const previewPanel = container.createDiv({ cls: 'notes-tab-preview' });
		const previewPlaceholder = previewPanel.createDiv({ cls: 'preview-placeholder' });
		const placeholderIcon = previewPlaceholder.createSpan({ cls: 'placeholder-icon' });
		setIcon(placeholderIcon, 'file-text');
		previewPlaceholder.createEl('p', { text: 'Select a note to preview' });
		previewPlaceholder.createEl('p', { text: 'Or click a verse with a note icon', cls: 'text-muted' });

		// Notes list
		const notesList = container.createDiv({ cls: 'notes-tab-list' });

		// Function to show note in preview
		const showNotePreview = async (notePath: string, refText: string) => {
			previewPanel.empty();

			const file = this.plugin.app.vault.getAbstractFileByPath(notePath);
			if (!file) return;

			// Preview header
			const previewHeader = previewPanel.createDiv({ cls: 'preview-header' });
			previewHeader.createEl('h4', { text: refText });

			// Action buttons
			const previewActions = previewHeader.createDiv({ cls: 'preview-actions' });
			const openBtn = previewActions.createEl('button', { cls: 'preview-action-btn', title: 'Open in editor' });
			setIcon(openBtn, 'external-link');
			this.registerDomEvent(openBtn, 'click', async () => {
				const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
				await leaf.openFile(file as any);
			});

			// Preview content (rendered markdown)
			const previewContent = previewPanel.createDiv({ cls: 'preview-content' });
			const content = await this.plugin.app.vault.read(file as any);
			// Remove frontmatter
			const withoutFm = content.replace(/^---[\s\S]*?---\s*/m, '');

			// Render markdown
			await MarkdownRenderer.render(
				this.plugin.app,
				withoutFm,
				previewContent,
				notePath,
				this
			);
		};

		if (chapterNotes.length === 0) {
			notesList.createEl('p', { text: 'No notes for this chapter yet.', cls: 'text-muted' });
			notesList.createEl('p', { text: 'Click "New Note" or right-click a verse to create one.', cls: 'text-muted hint-text' });
		} else {
			// Sort by verse number
			chapterNotes.sort((a, b) => (a.verse || 0) - (b.verse || 0));

			// Check if we have a selected verse with a note
			const selectedVerse = this.selectedVerseStart;
			const selectedVerseNote = selectedVerse
				? chapterNotes.find(n => n.verse === selectedVerse ||
					(n.verse && n.endVerse && selectedVerse >= n.verse && selectedVerse <= n.endVerse))
				: null;

			for (const note of chapterNotes) {
				const noteItem = notesList.createDiv({ cls: 'notes-tab-item' });

				// Note reference
				let refText = this.currentBook + ' ' + this.currentChapter;
				if (note.verse) {
					refText += ':' + note.verse;
					if (note.endVerse && note.endVerse !== note.verse) {
						refText += '-' + note.endVerse;
					}
				}

				const noteRef = noteItem.createDiv({ cls: 'note-ref' });
				const noteIcon = noteRef.createSpan({ cls: 'note-icon' });
				setIcon(noteIcon, note.level === 'chapter' ? 'file-text' : note.level === 'book' ? 'book' : 'bookmark');
				noteRef.createSpan({ text: refText });

				// Click to show in preview (not open in new pane)
				this.registerDomEvent(noteItem, 'click', () => {
					// Highlight selected item
					notesList.querySelectorAll('.notes-tab-item').forEach(el => el.removeClass('selected'));
					noteItem.addClass('selected');
					showNotePreview(note.path, refText);
				});

				// Double-click to open in editor
				this.registerDomEvent(noteItem, 'dblclick', async () => {
					const noteFile = this.plugin.app.vault.getAbstractFileByPath(note.path);
					if (noteFile) {
						const leaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
						await leaf.openFile(noteFile as any);
					}
				});

				// Auto-select if this note matches the selected verse
				if (selectedVerseNote && selectedVerseNote.path === note.path) {
					noteItem.addClass('selected');
					showNotePreview(note.path, refText);
				}
			}
		}
	}

	// ========== STUDY INSIGHTS MODE (15A) ==========
	renderStudyInsightsMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'insights-header' });
		const h2 = header.createEl('h2');
		const titleIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'bar-chart-2');
		h2.createSpan({ text: 'Study insights' });

		// Ensure studyHistory is initialized
		const studyHistory = this.plugin.settings.studyHistory || {
			totalStudyMinutes: 0,
			bookVisits: {},
			chapterVisits: {},
			weeklyStats: []
		};
		if (!studyHistory.bookVisits) studyHistory.bookVisits = {};
		if (!studyHistory.chapterVisits) studyHistory.chapterVisits = {};

		// Stats overview
		const statsGrid = container.createDiv({ cls: 'insights-stats-grid' });

		// Total study time
		const timeCard = statsGrid.createDiv({ cls: 'stat-card' });
		const timeIcon = timeCard.createSpan({ cls: 'stat-icon' });
		setIcon(timeIcon, 'clock');
		timeCard.createEl('div', { text: `${studyHistory.totalStudyMinutes} min`, cls: 'stat-value' });
		timeCard.createEl('div', { text: 'Total study time', cls: 'stat-label' });

		// Total books visited
		const bookCount = Object.keys(studyHistory.bookVisits).length;
		const bookCard = statsGrid.createDiv({ cls: 'stat-card' });
		const bookIcon = bookCard.createSpan({ cls: 'stat-icon' });
		setIcon(bookIcon, 'book');
		bookCard.createEl('div', { text: `${bookCount}`, cls: 'stat-value' });
		bookCard.createEl('div', { text: 'Books studied', cls: 'stat-label' });

		// Total chapters visited
		const chapterCount = Object.keys(studyHistory.chapterVisits).length;
		const chapterCard = statsGrid.createDiv({ cls: 'stat-card' });
		const chapterIcon = chapterCard.createSpan({ cls: 'stat-icon' });
		setIcon(chapterIcon, 'file-text');
		chapterCard.createEl('div', { text: `${chapterCount}`, cls: 'stat-value' });
		chapterCard.createEl('div', { text: 'Chapters visited', cls: 'stat-label' });

		// Current streak
		const streakCard = statsGrid.createDiv({ cls: 'stat-card' });
		const streakIcon = streakCard.createSpan({ cls: 'stat-icon' });
		setIcon(streakIcon, 'flame');
		streakCard.createEl('div', { text: `${this.plugin.settings.studyStreak}`, cls: 'stat-value' });
		streakCard.createEl('div', { text: 'Day streak', cls: 'stat-label' });

		// Insights section
		const insightsSection = container.createDiv({ cls: 'insights-section' });
		insightsSection.createEl('h3', { text: 'Insights' });

		// Most studied book
		const bookEntries = Object.entries(studyHistory.bookVisits).sort((a, b) => b[1] - a[1]);
		if (bookEntries.length > 0) {
			const [topBook, topBookCount] = bookEntries[0];
			insightsSection.createEl('p', { text: `📖 Most studied book: ${topBook} (${topBookCount} visits)` });
		}

		// Most studied chapter
		const chapterEntries = Object.entries(studyHistory.chapterVisits).sort((a, b) => b[1] - a[1]);
		if (chapterEntries.length > 0) {
			const [topChapter, topChapterCount] = chapterEntries[0];
			insightsSection.createEl('p', { text: `📄 Most studied chapter: ${topChapter} (${topChapterCount} visits)` });
		}

		// Book heatmap (66 books grid)
		const heatmapSection = container.createDiv({ cls: 'insights-heatmap-section' });
		heatmapSection.createEl('h3', { text: 'Study heatmap' });
		heatmapSection.createEl('p', { text: 'Darker = more visits', cls: 'heatmap-hint' });

		const allBooks = [
			'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
			'1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
			'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
			'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
			'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah',
			'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
			'2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
			'2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
			'1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'
		];

		const maxVisits = Math.max(...Object.values(studyHistory.bookVisits), 1);
		const heatmapGrid = heatmapSection.createDiv({ cls: 'heatmap-grid' });

		allBooks.forEach(book => {
			const visits = studyHistory.bookVisits[book] || 0;
			const intensity = visits / maxVisits;
			const cell = heatmapGrid.createDiv({
				cls: 'heatmap-cell',
				attr: { title: `${book}: ${visits} visits` }
			});
			cell.style.backgroundColor = `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})`;
			cell.createEl('span', { text: book.substring(0, 3), cls: 'heatmap-cell-label' });

			cell.addEventListener('click', () => {
				this.currentBook = book;
				this.currentChapter = 1;
				this.viewMode = ViewMode.CHAPTER;
				void this.render();
			});
		});

		// Export button
		const exportSection = container.createDiv({ cls: 'insights-export-section' });
		const exportBtn = exportSection.createEl('button', { text: 'Export study report', cls: 'insights-export-btn' });
		exportBtn.addEventListener('click', async () => {
			let report = '# Study Insights Report\n\n';
			report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
			report += `## Summary\n`;
			report += `- Total Study Time: ${studyHistory.totalStudyMinutes} minutes\n`;
			report += `- Books Studied: ${bookCount}\n`;
			report += `- Chapters Visited: ${chapterCount}\n`;
			report += `- Current Streak: ${this.plugin.settings.studyStreak} days\n\n`;

			if (bookEntries.length > 0) {
				report += `## Top Books\n`;
				bookEntries.slice(0, 10).forEach(([book, count], i) => {
					report += `${i + 1}. ${book} - ${count} visits\n`;
				});
			}

			await navigator.clipboard.writeText(report);
			showToast('Report exported to clipboard');
		});
	}

	// ========== COMPARISON MATRIX MODE (15F) ==========
	renderComparisonMatrixMode(container: HTMLElement) {
		const header = container.createDiv({ cls: 'comparison-header' });
		const h2 = header.createEl('h2');
		const titleIcon = h2.createSpan({ cls: 'title-icon' });
		setIcon(titleIcon, 'columns');
		h2.createSpan({ text: 'Version comparison' });

		// Version selector
		const selectorSection = container.createDiv({ cls: 'comparison-selector' });
		selectorSection.createEl('h4', { text: 'Select versions to compare (2-6):' });

		const versionsGrid = selectorSection.createDiv({ cls: 'versions-checkbox-grid' });
		const availableVersions = this.plugin.settings.bibleVersions;
		const selectedVersions: Set<string> = new Set(availableVersions.slice(0, Math.min(3, availableVersions.length)));

		availableVersions.forEach((version: string) => {
			const label = versionsGrid.createEl('label', { cls: 'version-checkbox-label' });
			const checkbox = label.createEl('input', { type: 'checkbox' });
			checkbox.checked = selectedVersions.has(version);
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					if (selectedVersions.size < 6) {
						selectedVersions.add(version);
					} else {
						checkbox.checked = false;
						showToast('Maximum 6 versions');
					}
				} else {
					if (selectedVersions.size > 2) {
						selectedVersions.delete(version);
					} else {
						checkbox.checked = true;
						showToast('Minimum 2 versions required');
					}
				}
			});
			label.createSpan({ text: version });
		});

		// Passage input
		const inputSection = container.createDiv({ cls: 'comparison-input-section' });
		const passageInput = inputSection.createEl('input', {
			type: 'text',
			placeholder: 'Enter verse or passage (e.g., John 3:16 or Romans 8:28-30)',
			cls: 'comparison-passage-input',
			value: `${this.currentBook} ${this.currentChapter}:1`
		});

		const compareBtn = inputSection.createEl('button', { text: 'Compare', cls: 'comparison-btn' });

		// Results container
		const resultsContainer = container.createDiv({ cls: 'comparison-results' });

		compareBtn.addEventListener('click', async () => {
			const passage = passageInput.value.trim();
			if (!passage) {
				showToast('Enter a passage to compare');
				return;
			}

			const versions = Array.from(selectedVersions);
			if (versions.length < 2) {
				showToast('Select at least 2 versions');
				return;
			}

			resultsContainer.empty();
			resultsContainer.createEl('p', { text: 'Loading...', cls: 'loading-text' });

			// Parse the passage
			const parsed = this.parseReference(passage);
			if (!parsed) {
				resultsContainer.empty();
				resultsContainer.createEl('p', { text: 'Could not parse passage reference', cls: 'error-text' });
				return;
			}

			const { book, chapter, startVerse, endVerse } = parsed;
			const verses: number[] = [];
			for (let v = startVerse; v <= (endVerse || startVerse); v++) {
				verses.push(v);
			}

			resultsContainer.empty();

			// Create comparison table
			const table = resultsContainer.createEl('table', { cls: 'comparison-table' });

			// Header row
			const headerRow = table.createEl('tr');
			headerRow.createEl('th', { text: 'Verse' });
			versions.forEach(v => headerRow.createEl('th', { text: v }));

			// Data rows
			for (const verseNum of verses) {
				const row = table.createEl('tr');
				row.createEl('td', { text: `${book} ${chapter}:${verseNum}`, cls: 'verse-ref-cell' });

				for (const version of versions) {
					const cell = row.createEl('td', { cls: 'verse-text-cell' });
					const text = this.plugin.getVerseText(version, book, chapter, verseNum);
					cell.textContent = text || '—';
				}
			}

			// Export button
			const exportBtn = resultsContainer.createEl('button', { text: 'Copy as Markdown Table', cls: 'comparison-export-btn' });
			exportBtn.addEventListener('click', async () => {
				let md = `| Verse | ${versions.join(' | ')} |\n`;
				md += `| --- | ${versions.map(() => '---').join(' | ')} |\n`;

				for (const verseNum of verses) {
					const texts = versions.map(v => {
						const text = this.plugin.getVerseText(v, book, chapter, verseNum);
						return (text || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
					});
					md += `| ${book} ${chapter}:${verseNum} | ${texts.join(' | ')} |\n`;
				}

				await navigator.clipboard.writeText(md);
				showToast('Copied to clipboard as Markdown table');
			});
		});

		// Auto-trigger compare with current verse
		setTimeout(() => compareBtn.click(), 100);
	}

	parseReference(ref: string): { book: string; chapter: number; startVerse: number; endVerse?: number } | null {
		// Parse references like "John 3:16" or "Romans 8:28-30"
		const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
		if (!match) return null;

		const [, book, chapter, startVerse, endVerse] = match;
		return {
			book: book.trim(),
			chapter: parseInt(chapter),
			startVerse: parseInt(startVerse),
			endVerse: endVerse ? parseInt(endVerse) : undefined
		};
	}
}

// Settings tab
class BiblePortalSettingTab extends PluginSettingTab {
	plugin: BiblePortalPlugin;

	constructor(app: App, plugin: BiblePortalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// Section collapse state
	private collapsedSections: Set<string> = new Set();

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('bp-settings-container');

		try {
			this.renderSettings(containerEl);
		} catch (error) {
			console.error('Bible Portal: Error rendering settings:', error);
			containerEl.empty();
			containerEl.createEl('p', { text: 'Error loading settings. Please try reloading Obsidian.' });
			containerEl.createEl('pre', { text: String(error), cls: 'bp-settings-error' });
		}
	}

	private renderSettings(containerEl: HTMLElement): void {
		// Header
		const header = containerEl.createDiv({ cls: 'bp-settings-header' });
		header.createEl('p', {
			text: 'Configure your Bible study experience',
			cls: 'settings-subtitle'
		});

		// Search bar
		const searchContainer = containerEl.createDiv({ cls: 'bp-settings-search' });
		const searchIcon = searchContainer.createSpan({ cls: 'search-icon' });
		setIcon(searchIcon, 'search');
		const searchInput = searchContainer.createEl('input', {
			type: 'text',
			placeholder: 'Search settings...'
		});
		searchInput.addEventListener('input', (e) => {
			const query = (e.target as HTMLInputElement).value.toLowerCase();
			this.filterSettings(containerEl, query);
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 1: Bible Versions & Reading
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'bible-versions',
			icon: 'book-open',
			title: 'Bible Versions & Reading',
			purpose: 'Choose which Bible translations to use and how text is displayed. The default version loads first when you open Bible Portal.',
			content: (content) => {
				// Default version dropdown
				new Setting(content)
					.setName('Default Bible version')
					.setDesc('The translation that loads automatically when you open Bible Portal')
					.addDropdown(dropdown => {
						this.plugin.settings.bibleVersions.forEach(version => {
							dropdown.addOption(version, version);
						});
						dropdown
							.setValue(this.plugin.settings.defaultVersion)
							.onChange(async (value) => {
								this.plugin.settings.defaultVersion = value;
								await this.plugin.saveSettings();
							});
					});

				// Installed versions display
				if (this.plugin.settings.bibleVersions.length > 0) {
					const versionsStatus = content.createDiv({ cls: 'bp-settings-status' });
					const statusIcon = versionsStatus.createSpan({ cls: 'status-icon success' });
					versionsStatus.createSpan({
						text: `${this.plugin.settings.bibleVersions.length} translation${this.plugin.settings.bibleVersions.length !== 1 ? 's' : ''} installed: ${this.plugin.settings.bibleVersions.join(', ')}`,
						cls: 'status-text'
					});
				}

				// Parallel view toggle
				new Setting(content)
					.setName('Enable parallel view by default')
					.setDesc('Show two Bible versions side-by-side when you open a chapter')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.parallelViewEnabled)
						.onChange(async (value) => {
							this.plugin.settings.parallelViewEnabled = value;
							await this.plugin.saveSettings();
						}));

				// Home verse
				new Setting(content)
					.setName('Home verse')
					.setDesc('Your favorite verse - the 🏠 button navigates here instantly')
					.addText(text => text
						.setPlaceholder('John 3:16')
						.setValue(this.plugin.settings.homeVerse)
						.onChange(async (value) => {
							this.plugin.settings.homeVerse = value;
							await this.plugin.saveSettings();
						}));
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 2: Display & Appearance
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'display',
			icon: 'palette',
			title: 'Display & Appearance',
			purpose: 'Customize how Bible text looks - fonts, sizes, colors, and themes. Make it comfortable for long reading sessions.',
			content: (content) => {
				// Banner theme with visual preview
				const themeGroup = content.createDiv({ cls: 'bp-settings-group' });
				themeGroup.createEl('div', { text: 'Banner theme', cls: 'bp-settings-group-title' });

				const themePreview = themeGroup.createDiv({ cls: 'bp-settings-preview-row' });
				const themes = [
					{ id: 'parchment', name: 'Parchment', desc: 'Aged manuscript' },
					{ id: 'holy-light', name: 'Holy light', desc: 'Gold & white' },
					{ id: 'royal', name: 'Royal', desc: 'Deep purple' },
					{ id: 'sacrifice', name: 'Sacrifice', desc: 'Crimson & gold' },
					{ id: 'ocean', name: 'Ocean', desc: 'Deep blue' },
					{ id: 'custom', name: 'Custom', desc: 'Your color' }
				];
				themes.forEach(theme => {
					const item = themePreview.createDiv({
						cls: `bp-settings-preview-item ${this.plugin.settings.bannerTheme === theme.id ? 'selected' : ''}`
					});
					item.createDiv({ cls: `preview-swatch theme-preview-${theme.id}` });
					item.createDiv({ text: theme.name, cls: 'preview-label' });
					item.addEventListener('click', async () => {
						this.plugin.settings.bannerTheme = theme.id as any;
						await this.plugin.saveSettings();
						this.plugin.refreshView();
						this.display();
					});
				});

				// Custom color picker (shown only when custom selected)
				if (this.plugin.settings.bannerTheme === 'custom') {
					new Setting(content)
						.setName('Custom banner color')
						.setDesc('Choose your own banner background color')
						.addText(text => text
							.setValue(this.plugin.settings.bannerColor)
							.onChange(async (value) => {
								this.plugin.settings.bannerColor = value;
								await this.plugin.saveSettings();
								this.plugin.refreshView();
							}))
						.addExtraButton(btn => {
							const colorInput = btn.extraSettingsEl.createEl('input', {
								type: 'color',
								value: this.plugin.settings.bannerColor
							});
							colorInput.style.width = '32px';
							colorInput.style.height = '24px';
							colorInput.style.border = 'none';
							colorInput.style.cursor = 'pointer';
							colorInput.addEventListener('change', async () => {
								this.plugin.settings.bannerColor = colorInput.value;
								await this.plugin.saveSettings();
								this.plugin.refreshView();
								this.display();
							});
						});
				}

				// Banner icon
				new Setting(content)
					.setName('Banner icon')
					.setDesc('Emoji displayed in the banner (e.g., 📖, ✝️, 🙏)')
					.addText(text => text
						.setPlaceholder('📖')
						.setValue(this.plugin.settings.bannerIcon)
						.onChange(async (value) => {
							this.plugin.settings.bannerIcon = value || '📖';
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				// Font settings group
				const fontGroup = content.createDiv({ cls: 'bp-settings-group' });
				fontGroup.createEl('div', { text: 'Typography', cls: 'bp-settings-group-title' });

				// Font preview
				const fontPreview = fontGroup.createDiv({ cls: 'font-preview-sample' });
				fontPreview.createDiv({
					text: '"For God so loved the world, that he gave his only Son..."',
					cls: 'sample-verse'
				});
				fontPreview.style.fontFamily = this.plugin.settings.fontFamily;
				fontPreview.style.fontSize = `${this.plugin.settings.fontSize}px`;
				fontPreview.createDiv({ text: 'John 3:16', cls: 'sample-ref' });

				new Setting(content)
					.setName('Font size')
					.setDesc('Size of Bible text (12-24 pixels)')
					.addSlider(slider => slider
						.setLimits(12, 24, 1)
						.setValue(this.plugin.settings.fontSize)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.fontSize = value;
							await this.plugin.saveSettings();
							fontPreview.style.fontSize = `${value}px`;
							this.plugin.refreshView();
						}));

				new Setting(content)
					.setName('Font style')
					.setDesc('Serif fonts have a classic book feel; sans-serif is modern')
					.addDropdown(dropdown => dropdown
						.addOption('sans-serif', 'Sans-serif (Modern)')
						.addOption('serif', 'Serif (Classic)')
						.setValue(this.plugin.settings.fontStyle)
						.onChange(async (value: 'sans-serif' | 'serif') => {
							this.plugin.settings.fontStyle = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				new Setting(content)
					.setName('Font family')
					.setDesc('Specific font to use for Bible text')
					.addDropdown(dropdown => dropdown
						.addOption('system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 'System default')
						.addOption('Georgia, serif', 'Georgia')
						.addOption('"Times New Roman", Times, serif', 'Times New Roman')
						.addOption('Arial, sans-serif', 'Arial')
						.setValue(this.plugin.settings.fontFamily)
						.onChange(async (value) => {
							this.plugin.settings.fontFamily = value;
							fontPreview.style.fontFamily = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				// Verse number style
				new Setting(content)
					.setName('Verse number style')
					.setDesc('How verse numbers appear in the text')
					.addDropdown(dropdown => dropdown
						.addOption('default', 'Default (Bold, colored)')
						.addOption('superscript', 'Superscript (Small, raised)')
						.addOption('badge', 'Badge (Pill-shaped)')
						.addOption('margin', 'Margin (Left-aligned)')
						.addOption('subtle', 'Subtle (Dimmed)')
						.setValue(this.plugin.settings.verseNumberStyle || 'default')
						.onChange(async (value: 'default' | 'superscript' | 'badge' | 'margin' | 'subtle') => {
							this.plugin.settings.verseNumberStyle = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				// Layout options
				const layoutGroup = content.createDiv({ cls: 'bp-settings-group' });
				layoutGroup.createEl('div', { text: 'Layout', cls: 'bp-settings-group-title' });

				new Setting(content)
					.setName('Readable line length')
					.setDesc('Limit text width for comfortable reading (like a book)')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.readableLineLength)
						.onChange(async (value) => {
							this.plugin.settings.readableLineLength = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				new Setting(content)
					.setName('Show secondary navigation')
					.setDesc('Display the second row with version selector and view toggles')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.showSecondaryNav)
						.onChange(async (value) => {
							this.plugin.settings.showSecondaryNav = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 3: Highlighting & Annotation
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'highlighting',
			icon: 'highlighter',
			title: 'Highlighting & Annotation',
			badge: (this.plugin.highlights?.length || 0) > 0 ? `${this.plugin.highlights.length}` : undefined,
			purpose: 'Customize highlight colors and annotation layers. Layers help organize highlights for different study purposes (personal study, sermon prep, word studies).',
			content: (content) => {
				// Highlight style
				new Setting(content)
					.setName('Highlight style')
					.setDesc('Visual appearance of highlights on verses')
					.addDropdown(dropdown => dropdown
						.addOption('handdrawn', 'Hand-drawn (natural marker look)')
						.addOption('gradient', 'Gradient (fade effect)')
						.addOption('solid', 'Solid (uniform color)')
						.setValue(this.plugin.settings.highlightStyle || 'handdrawn')
						.onChange(async (value: 'solid' | 'gradient' | 'handdrawn') => {
							this.plugin.settings.highlightStyle = value;
							await this.plugin.saveSettings();
						}));

				// Color palette display
				const colorGroup = content.createDiv({ cls: 'bp-settings-group' });
				colorGroup.createEl('div', { text: 'Highlight colors', cls: 'bp-settings-group-title' });

				// Count highlights by color
				const colorCounts: { [color: string]: number } = {};
				(this.plugin.highlights || []).forEach(h => {
					colorCounts[h.color] = (colorCounts[h.color] || 0) + 1;
				});

				const colorPalette = colorGroup.createDiv({ cls: 'bp-settings-color-palette' });
				this.plugin.settings.highlightColors.forEach((colorDef, index) => {
					const chip = colorPalette.createDiv({ cls: 'bp-settings-color-chip' });
					const dot = chip.createSpan({ cls: 'color-dot' });
					dot.style.backgroundColor = colorDef.color;
					chip.createSpan({ text: colorDef.name, cls: 'color-name' });
					if (colorCounts[colorDef.color]) {
						chip.createSpan({ text: `${colorCounts[colorDef.color]}`, cls: 'color-count' });
					}
				});

				// Edit colors
				this.plugin.settings.highlightColors.forEach((colorDef, index) => {
					const setting = new Setting(content)
						.setName(`${colorDef.name}`)
						.addText(text => text
							.setPlaceholder('Name')
							.setValue(colorDef.name)
							.onChange(async (value) => {
								this.plugin.settings.highlightColors[index].name = value;
								await this.plugin.saveSettings();
							}))
						.addExtraButton(btn => {
							const colorInput = btn.extraSettingsEl.createEl('input', {
								type: 'color',
								value: colorDef.color.startsWith('#') ? colorDef.color : '#ffeb3b'
							});
							colorInput.style.width = '32px';
							colorInput.style.height = '24px';
							colorInput.style.border = 'none';
							colorInput.style.cursor = 'pointer';
							colorInput.addEventListener('change', async () => {
								this.plugin.settings.highlightColors[index].color = colorInput.value;
								await this.plugin.saveSettings();
								this.display();
							});
						})
						.addButton(button => button
							.setIcon('trash-2')
							.setTooltip('Remove color')
							.onClick(async () => {
								this.plugin.settings.highlightColors.splice(index, 1);
								await this.plugin.saveSettings();
								this.display();
							}));
				});

				// Add color button
				const colorActions = content.createDiv({ cls: 'bp-settings-actions' });
				const addColorBtn = colorActions.createEl('button', { text: '+ Add Color', cls: 'action-secondary' });
				addColorBtn.addEventListener('click', async () => {
					this.plugin.settings.highlightColors.push({ name: 'New color', color: '#ffeb3b' });
					await this.plugin.saveSettings();
					this.display();
				});

				// Annotation Layers
				const layerGroup = content.createDiv({ cls: 'bp-settings-group' });
				layerGroup.createEl('div', { text: 'Annotation layers', cls: 'bp-settings-group-title' });

				const layerPurpose = layerGroup.createDiv({ cls: 'bp-settings-purpose' });
				layerPurpose.textContent = 'Layers let you organize highlights by purpose. Toggle layers on/off to focus on specific study contexts.';

				// Active layer selector
				new Setting(content)
					.setName('Active layer')
					.setDesc('New highlights are added to this layer')
					.addDropdown(dropdown => {
						this.plugin.settings.annotationLayers.forEach(layer => {
							dropdown.addOption(layer.id, layer.name);
						});
						dropdown
							.setValue(this.plugin.settings.activeAnnotationLayer)
							.onChange(async (value) => {
								this.plugin.settings.activeAnnotationLayer = value;
								await this.plugin.saveSettings();
							});
					});

				// Layer list
				const layerList = content.createDiv({ cls: 'bp-settings-layer-list' });
				this.plugin.settings.annotationLayers.forEach((layer, index) => {
					const item = layerList.createDiv({ cls: 'bp-settings-layer-item' });

					// Color picker
					const colorInput = item.createEl('input', { type: 'color', cls: 'layer-color' });
					colorInput.value = layer.color;
					colorInput.addEventListener('change', async () => {
						this.plugin.settings.annotationLayers[index].color = colorInput.value;
						await this.plugin.saveSettings();
					});

					// Visibility toggle
					const isVisible = this.plugin.settings.visibleAnnotationLayers.includes(layer.id);
					const visBtn = item.createEl('button', { cls: `layer-visibility ${isVisible ? 'visible' : ''}` });
					setIcon(visBtn, isVisible ? 'eye' : 'eye-off');
					visBtn.addEventListener('click', async () => {
						if (isVisible) {
							this.plugin.settings.visibleAnnotationLayers = this.plugin.settings.visibleAnnotationLayers.filter(id => id !== layer.id);
						} else {
							this.plugin.settings.visibleAnnotationLayers.push(layer.id);
						}
						await this.plugin.saveSettings();
						this.display();
					});

					// Name input
					const nameInput = item.createEl('input', { type: 'text', cls: 'layer-name', value: layer.name });
					nameInput.addEventListener('change', async () => {
						this.plugin.settings.annotationLayers[index].name = nameInput.value;
						await this.plugin.saveSettings();
					});

					// Active badge
					if (layer.id === this.plugin.settings.activeAnnotationLayer) {
						item.createSpan({ text: 'Active', cls: 'layer-badge' });
					}

					// Delete button (not for defaults)
					if (!layer.isDefault) {
						const deleteBtn = item.createEl('button', { cls: 'layer-delete' });
						setIcon(deleteBtn, 'trash-2');
						deleteBtn.addEventListener('click', async () => {
							const confirmed = await showConfirmModal(
								this.app,
								'Delete layer?',
								`Delete layer "${layer.name}"?`,
								{ confirmText: 'Delete', isDestructive: true }
							);
							if (confirmed) {
								this.plugin.settings.annotationLayers.splice(index, 1);
								this.plugin.settings.visibleAnnotationLayers = this.plugin.settings.visibleAnnotationLayers.filter(id => id !== layer.id);
								if (this.plugin.settings.activeAnnotationLayer === layer.id) {
									this.plugin.settings.activeAnnotationLayer = 'personal';
								}
								await this.plugin.saveSettings();
								this.display();
							}
						});
					}
				});

				// Add layer button
				const layerActions = content.createDiv({ cls: 'bp-settings-actions' });
				const addLayerBtn = layerActions.createEl('button', { text: '+ Add Layer', cls: 'action-secondary' });
				addLayerBtn.addEventListener('click', async () => {
					const newLayer: AnnotationLayer = {
						id: `layer-${Date.now()}`,
						name: 'New layer',
						color: '#10b981',
						createdDate: new Date().toISOString(),
						isDefault: false
					};
					this.plugin.settings.annotationLayers.push(newLayer);
					this.plugin.settings.visibleAnnotationLayers.push(newLayer.id);
					await this.plugin.saveSettings();
					this.display();
				});
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 4: Notes & Study
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'notes',
			icon: 'file-text',
			title: 'Notes & Study',
			purpose: 'Configure where notes are saved and how they\'re formatted. Notes are stored as regular Obsidian markdown files in your vault.',
			content: (content) => {
				new Setting(content)
					.setName('Notes folder')
					.setDesc('Where Bible study notes are saved in your vault')
					.addText(text => text
						.setPlaceholder('Bible Portal/Notes')
						.setValue(this.plugin.settings.notesFolder)
						.onChange(async (value) => {
							this.plugin.settings.notesFolder = value;
							await this.plugin.saveSettings();
						}));

				new Setting(content)
					.setName('Note template')
					.setDesc('Template for new notes. Variables: {{reference}}, {{version}}, {{verse}}, {{verseText}}')
					.addTextArea(text => {
						text.inputEl.rows = 8;
						text.inputEl.style.width = '100%';
						text.inputEl.style.fontFamily = 'monospace';
						return text
							.setPlaceholder('# {{reference}}\n\n**Version:** {{version}}')
							.setValue(this.plugin.settings.noteTemplate)
							.onChange(async (value) => {
								this.plugin.settings.noteTemplate = value;
								await this.plugin.saveSettings();
							});
					});

				// Copy settings group
				const copyGroup = content.createDiv({ cls: 'bp-settings-group' });
				copyGroup.createEl('div', { text: 'Copy & Export', cls: 'bp-settings-group-title' });

				new Setting(content)
					.setName('Include reference when copying')
					.setDesc('Add verse reference (e.g., "John 3:16") to copied text')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.copyIncludeReference)
						.onChange(async (value) => {
							this.plugin.settings.copyIncludeReference = value;
							await this.plugin.saveSettings();
						}));

				new Setting(content)
					.setName('Callout type')
					.setDesc('Type for copied callouts (e.g., "bible" for > [!bible])')
					.addText(text => text
						.setPlaceholder('bible')
						.setValue(this.plugin.settings.calloutTitle)
						.onChange(async (value) => {
							this.plugin.settings.calloutTitle = value || 'bible';
							await this.plugin.saveSettings();
						}));

				new Setting(content)
					.setName('Image export folder')
					.setDesc('Where verse images are saved')
					.addText(text => text
						.setPlaceholder('Bible Portal/Images')
						.setValue(this.plugin.settings.imageExportFolder)
						.onChange(async (value) => {
							this.plugin.settings.imageExportFolder = value;
							await this.plugin.saveSettings();
						}));

				new Setting(content)
					.setName('Image quality')
					.setDesc('JPEG quality for exported images (50-100)')
					.addSlider(slider => slider
						.setLimits(50, 100, 5)
						.setValue(this.plugin.settings.imageExportQuality)
						.setDynamicTooltip()
						.onChange(async (value) => {
							this.plugin.settings.imageExportQuality = value;
							await this.plugin.saveSettings();
						}));
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 5: Study Tools
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'study-tools',
			icon: 'book-marked',
			title: 'Study tools',
			purpose: 'Configure advanced study features like cross-references, Strong\'s Concordance, and Jesus words highlighting.',
			content: (content) => {
				// Study Data Downloads Group
				const downloadGroup = content.createDiv({ cls: 'bp-settings-group' });
				downloadGroup.createEl('div', { text: 'Study data downloads', cls: 'bp-settings-group-title' });

				const downloadPurpose = downloadGroup.createDiv({ cls: 'bp-settings-purpose' });
				downloadPurpose.textContent = 'Download study resources to enable cross-references, word studies, and contextual information.';

				// Cross-references status and download
				if (this.plugin.crossReferences) {
					const crossRefStatus = content.createDiv({ cls: 'bp-settings-status' });
					crossRefStatus.createSpan({ cls: 'status-icon success' });
					const verseCount = Object.keys(this.plugin.crossReferences).length;
					crossRefStatus.createSpan({
						text: `Cross-references loaded: ${verseCount.toLocaleString()} verses`,
						cls: 'status-text'
					});
				} else {
					const crossRefStatus = content.createDiv({ cls: 'bp-settings-status' });
					crossRefStatus.createSpan({ cls: 'status-icon warning' });
					crossRefStatus.createSpan({
						text: 'Cross-references not downloaded',
						cls: 'status-text'
					});
					const downloadBtn = crossRefStatus.createEl('button', { text: 'Download', cls: 'action-primary action-inline' });
					downloadBtn.addEventListener('click', async () => {
						downloadBtn.disabled = true;
						downloadBtn.textContent = 'Downloading...';
						await this.plugin.downloadCrossReferences();
						this.display();
					});
				}

				// Strong's status and download
				if (this.plugin.strongsDictionary) {
					const strongsStatus = content.createDiv({ cls: 'bp-settings-status' });
					strongsStatus.createSpan({ cls: 'status-icon success' });
					const greekCount = this.plugin.strongsDictionary.greek ? Object.keys(this.plugin.strongsDictionary.greek).length : 0;
					const hebrewCount = this.plugin.strongsDictionary.hebrew ? Object.keys(this.plugin.strongsDictionary.hebrew).length : 0;
					strongsStatus.createSpan({
						text: `Strong's loaded: ${greekCount.toLocaleString()} Greek + ${hebrewCount.toLocaleString()} Hebrew + Interlinear`,
						cls: 'status-text'
					});
				} else {
					const strongsStatus = content.createDiv({ cls: 'bp-settings-status' });
					strongsStatus.createSpan({ cls: 'status-icon warning' });
					strongsStatus.createSpan({
						text: "Strong's & Interlinear data not downloaded",
						cls: 'status-text'
					});
					const downloadBtn = strongsStatus.createEl('button', { text: 'Download', cls: 'action-primary action-inline' });
					downloadBtn.addEventListener('click', async () => {
						downloadBtn.disabled = true;
						downloadBtn.textContent = 'Downloading...';
						await this.plugin.downloadStrongsDictionaries();
						this.display();
					});
				}

				// Theographic data status and download
				if (this.plugin.theographicData && this.plugin.theographicData.loaded) {
					const theographicStatus = content.createDiv({ cls: 'bp-settings-status' });
					theographicStatus.createSpan({ cls: 'status-icon success' });
					const peopleCount = this.plugin.theographicData.people?.length || 0;
					const placesCount = this.plugin.theographicData.places?.length || 0;
					theographicStatus.createSpan({
						text: `Theographic loaded: ${peopleCount.toLocaleString()} people, ${placesCount.toLocaleString()} places`,
						cls: 'status-text'
					});
				} else {
					const theographicStatus = content.createDiv({ cls: 'bp-settings-status' });
					theographicStatus.createSpan({ cls: 'status-icon warning' });
					theographicStatus.createSpan({
						text: 'Theographic metadata not downloaded',
						cls: 'status-text'
					});
					const downloadBtn = theographicStatus.createEl('button', { text: 'Download', cls: 'action-primary action-inline' });
					downloadBtn.addEventListener('click', async () => {
						downloadBtn.disabled = true;
						downloadBtn.textContent = 'Downloading...';
						await this.plugin.downloadTheographicData();
						this.display();
					});
				}

				// Commentary data status and download
				// Check if commentary is loaded by looking at plugin's commentary data
				const commentaryLoaded = this.plugin.commentaryData && Object.keys(this.plugin.commentaryData).length > 0;
				if (commentaryLoaded) {
					const commentaryStatus = content.createDiv({ cls: 'bp-settings-status' });
					commentaryStatus.createSpan({ cls: 'status-icon success' });
					commentaryStatus.createSpan({
						text: 'Matthew Henry Commentary loaded',
						cls: 'status-text'
					});
				} else {
					const commentaryStatus = content.createDiv({ cls: 'bp-settings-status' });
					commentaryStatus.createSpan({ cls: 'status-icon warning' });
					commentaryStatus.createSpan({
						text: 'Matthew Henry Commentary not downloaded',
						cls: 'status-text'
					});
					const downloadBtn = commentaryStatus.createEl('button', { text: 'Download', cls: 'action-primary action-inline' });
					downloadBtn.addEventListener('click', async () => {
						downloadBtn.disabled = true;
						downloadBtn.textContent = 'Downloading...';
						await this.plugin.downloadCommentaryData();
						this.display();
					});
				}

				// Disputed passages group
				const disputedGroup = content.createDiv({ cls: 'bp-settings-group' });
				disputedGroup.createEl('div', { text: 'Textual criticism', cls: 'bp-settings-group-title' });

				const disputedPurpose = disputedGroup.createDiv({ cls: 'bp-settings-purpose' });
				disputedPurpose.textContent = 'Some passages have textual variants between ancient manuscripts. These settings control how disputed passages are indicated.';

				new Setting(content)
					.setName('Show disputed passage indicators')
					.setDesc('Display markers for passages with significant textual variants')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.showDisputedPassages)
						.onChange(async (value) => {
							this.plugin.settings.showDisputedPassages = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
						}));

				new Setting(content)
					.setName('Show explanatory tooltips')
					.setDesc('Show manuscript information when hovering over disputed indicators')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.showDisputedTooltips)
						.onChange(async (value) => {
							this.plugin.settings.showDisputedTooltips = value;
							await this.plugin.saveSettings();
						}));

				// Verse of the Day
				const votdGroup = content.createDiv({ cls: 'bp-settings-group' });
				votdGroup.createEl('div', { text: 'Verse of the Day', cls: 'bp-settings-group-title' });

				new Setting(content)
					.setName('Enable verse of the day')
					.setDesc('Show a daily verse on the dashboard')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.verseOfTheDayEnabled)
						.onChange(async (value) => {
							this.plugin.settings.verseOfTheDayEnabled = value;
							await this.plugin.saveSettings();
						}));

				const votdActions = content.createDiv({ cls: 'bp-settings-actions' });
				const regenerateBtn = votdActions.createEl('button', { text: 'Regenerate mapping', cls: 'action-secondary' });
				regenerateBtn.addEventListener('click', async () => {
					const confirmed = await showConfirmModal(
						this.app,
						'Regenerate mapping?',
						'Generate a new random verse mapping? This overwrites the existing mapping.',
						{ confirmText: 'Regenerate', isDestructive: false }
					);
					if (confirmed) {
						const success = await this.plugin.generateVOTDMapping();
						if (success) {
							new Notice('✅ Verse mapping regenerated!');
						}
					}
				});

				const exportVotdBtn = votdActions.createEl('button', { text: 'Export', cls: 'action-secondary' });
				exportVotdBtn.addEventListener('click', async () => {
					const votdPath = `${this.plugin.getPluginDataPath()}/verse-of-the-day.json`;
					const adapter = this.app.vault.adapter;
					if (!(await adapter.exists(votdPath))) {
						new Notice('No VOTD mapping found');
						return;
					}
					const json = await adapter.read(votdPath);
					const blob = new Blob([json], { type: 'application/json' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = 'bible-portal-votd.json';
					a.click();
					URL.revokeObjectURL(url);
					new Notice('✅ Exported!');
				});

				// Search settings
				const searchGroup = content.createDiv({ cls: 'bp-settings-group' });
				searchGroup.createEl('div', { text: 'Search', cls: 'bp-settings-group-title' });

				new Setting(content)
					.setName('Default search scope')
					.setDesc('Initial scope when opening search')
					.addDropdown(dropdown => dropdown
						.addOption('all', 'All books')
						.addOption('book', 'Current book')
						.addOption('chapter', 'Current chapter')
						.setValue(this.plugin.settings.defaultSearchScope)
						.onChange(async (value) => {
							this.plugin.settings.defaultSearchScope = value as 'all' | 'book' | 'chapter';
							await this.plugin.saveSettings();
						}));
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 6: Reading Plans
		// ═══════════════════════════════════════════════════════════════
		const activePlans = this.plugin.getActiveReadingPlans();
		this.createSection(containerEl, {
			id: 'reading-plans',
			icon: 'calendar',
			title: 'Reading plans',
			badge: activePlans.length > 0 ? `${activePlans.length} active` : undefined,
			purpose: 'Follow structured Bible reading plans. Activate multiple plans simultaneously and track your progress.',
			content: (content) => {

				new Setting(content)
					.setName('Enable reading plans')
					.setDesc('Track daily reading progress across multiple plans')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.enableReadingPlan)
						.onChange(async (value) => {
							this.plugin.settings.enableReadingPlan = value;
							await this.plugin.saveSettings();
							this.display();
						}));

				new Setting(content)
					.setName('Show reading plan reminder')
					.setDesc('Remind you to read when opening Bible Portal')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.readingPlanReminder)
						.onChange(async (value) => {
							this.plugin.settings.readingPlanReminder = value;
							await this.plugin.saveSettings();
						}));

				if (this.plugin.settings.enableReadingPlan) {
					// Plan cards
					const plansGroup = content.createDiv({ cls: 'bp-settings-group' });
					plansGroup.createEl('div', { text: 'Available plans', cls: 'bp-settings-group-title' });

					READING_PLANS.forEach(plan => {
						const isActive = this.plugin.settings.activeReadingPlans.includes(plan.id);
						const progress = this.plugin.getReadingPlanProgress(plan.id);

						const card = plansGroup.createDiv({ cls: `bp-settings-plan-card ${isActive ? 'active' : ''}` });

						const planInfo = card.createDiv({ cls: 'plan-info' });
						planInfo.createDiv({ text: plan.name, cls: 'plan-name' });
						planInfo.createDiv({ text: `${plan.description} (${plan.totalDays} days)`, cls: 'plan-desc' });

						if (isActive && progress > 0) {
							const progressDiv = card.createDiv({ cls: 'plan-progress' });
							progressDiv.createDiv({ text: `${progress}%`, cls: 'plan-progress-value' });
							progressDiv.createDiv({ text: 'complete', cls: 'plan-progress-label' });
						}

						// Toggle switch
						const toggle = card.createEl('input', { type: 'checkbox' });
						toggle.checked = isActive;
						toggle.style.cursor = 'pointer';
						toggle.addEventListener('change', async () => {
							await this.plugin.toggleReadingPlan(plan.id);
							this.display();
						});
					});

					// Today's readings
					const todaysReadings = this.plugin.getTodaysReadings();
					if (todaysReadings.length > 0) {
						const todayGroup = content.createDiv({ cls: 'bp-settings-group' });
						todayGroup.createEl('div', { text: "Today's Readings", cls: 'bp-settings-group-title' });

						todaysReadings.forEach(reading => {
							const readingDiv = todayGroup.createDiv({ cls: 'bp-settings-status' });
							readingDiv.createSpan({ cls: `status-icon ${reading.completed ? 'success' : 'warning'}` });
							readingDiv.createSpan({
								text: `${reading.plan.name}: ${reading.passages.join(', ')}${reading.completed ? ' ✓' : ''}`,
								cls: 'status-text'
							});
						});
					}
				}
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 7: Memorization
		// ═══════════════════════════════════════════════════════════════
		const memVerseCount = this.plugin.settings.memorizationVerses?.length || 0;
		this.createSection(containerEl, {
			id: 'memorization',
			icon: 'brain',
			title: 'Memorization',
			badge: memVerseCount > 0 ? `${memVerseCount} verses` : undefined,
			purpose: 'Practice memorizing Scripture using spaced repetition. Add verses to your list and review them with flashcards.',
			content: (content) => {
				new Setting(content)
					.setName('Enable memorization mode')
					.setDesc('Track and practice Scripture memorization with spaced repetition')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.enableMemorization)
						.onChange(async (value) => {
							this.plugin.settings.enableMemorization = value;
							await this.plugin.saveSettings();
						}));

				if (this.plugin.settings.enableMemorization) {
					const memSettings = this.plugin.settings.memorizationSettings;

					new Setting(content)
						.setName('New cards per day')
						.setDesc('Maximum new verses to introduce each day')
						.addSlider(slider => slider
							.setLimits(1, 10, 1)
							.setValue(memSettings.newCardsPerDay)
							.setDynamicTooltip()
							.onChange(async (value) => {
								this.plugin.settings.memorizationSettings.newCardsPerDay = value;
								await this.plugin.saveSettings();
							}));

					new Setting(content)
						.setName('Show hints')
						.setDesc('Show first letter hints when practicing')
						.addToggle(toggle => toggle
							.setValue(memSettings.showHints)
							.onChange(async (value) => {
								this.plugin.settings.memorizationSettings.showHints = value;
								await this.plugin.saveSettings();
							}));

					// Stats
					if (memVerseCount > 0) {
						const statsGrid = content.createDiv({ cls: 'bp-settings-stats' });

						const verses = this.plugin.settings.memorizationVerses;
						const mastered = verses.filter(v => v.status === 'mastered').length;
						const learning = verses.filter(v => v.status === 'learning').length;
						const newCount = verses.filter(v => v.status === 'new').length;

						const stats = [
							{ label: 'Total', value: memVerseCount },
							{ label: 'Mastered', value: mastered },
							{ label: 'Learning', value: learning },
							{ label: 'New', value: newCount }
						];

						stats.forEach(stat => {
							const card = statsGrid.createDiv({ cls: 'bp-settings-stat-card' });
							card.createDiv({ text: String(stat.value), cls: 'stat-value' });
							card.createDiv({ text: stat.label, cls: 'stat-label' });
						});
					}
				}
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 8: Achievements & Gamification
		// ═══════════════════════════════════════════════════════════════
		const achievementProgress = this.plugin.getAchievementProgress();
		this.createSection(containerEl, {
			id: 'achievements',
			icon: 'trophy',
			title: 'Achievements & Gamification',
			badge: this.plugin.settings.enableAchievements ? `${achievementProgress.unlocked}/${achievementProgress.total}` : undefined,
			purpose: 'Earn achievements for consistent Bible study. Track chapters read, notes created, highlights added, and study streaks.',
			content: (content) => {
				new Setting(content)
					.setName('Enable achievements')
					.setDesc('Unlock achievements for reading, notes, highlights, and streaks')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.enableAchievements)
						.onChange(async (value) => {
							this.plugin.settings.enableAchievements = value;
							await this.plugin.saveSettings();
							this.plugin.refreshView();
							this.display();
						}));

				if (this.plugin.settings.enableAchievements) {
					// Progress bar
					const progressSection = content.createDiv();
					progressSection.createDiv({ text: `${achievementProgress.percentage}% Complete`, cls: 'bp-settings-group-title' });
					const progressBar = progressSection.createDiv({ cls: 'bp-settings-progress' });
					const progressFill = progressBar.createDiv({ cls: 'bp-settings-progress-bar' });
					progressFill.style.width = `${achievementProgress.percentage}%`;

					// Stats grid
					const stats = this.plugin.settings.achievementStats || DEFAULT_ACHIEVEMENT_STATS;
					const statsGrid = content.createDiv({ cls: 'bp-settings-stats' });

					const statItems = [
						{ label: 'Chapters', value: stats.totalChaptersRead, icon: '📖' },
						{ label: 'Notes', value: stats.totalNotesCreated, icon: '📝' },
						{ label: 'Highlights', value: stats.totalHighlightsAdded, icon: '🎨' },
						{ label: 'Best streak', value: `${stats.longestStreak}d`, icon: '🔥' }
					];

					statItems.forEach(item => {
						const card = statsGrid.createDiv({ cls: 'bp-settings-stat-card' });
						card.createDiv({ text: String(item.value), cls: 'stat-value' });
						card.createDiv({ text: item.label, cls: 'stat-label' });
					});

					// Reset button
					const actions = content.createDiv({ cls: 'bp-settings-actions' });
					const resetBtn = actions.createEl('button', { text: 'Reset achievements', cls: 'action-danger' });
					resetBtn.addEventListener('click', async () => {
						const confirmed = await showConfirmModal(
							this.app,
							'Reset achievements?',
							'Reset ALL achievements and stats? This cannot be undone.',
							{ confirmText: 'Reset', isDestructive: true }
						);
						if (confirmed) {
							this.plugin.settings.unlockedAchievements = [];
							this.plugin.settings.achievementStats = { ...DEFAULT_ACHIEVEMENT_STATS };
							await this.plugin.saveSettings();
							new Notice('Achievements reset');
							this.display();
						}
					});
				}
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 9: Session Tracking
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'session-tracking',
			icon: 'clock',
			title: 'Session tracking',
			badge: this.plugin.settings.studyStreak > 0 ? `${this.plugin.settings.studyStreak}🔥` : undefined,
			purpose: 'Track your study sessions to see patterns in your Bible reading. Build streaks by studying consistently.',
			content: (content) => {
				new Setting(content)
					.setName('Track study sessions')
					.setDesc('Monitor chapters visited, notes created, and highlights during each session')
					.addToggle(toggle => toggle
						.setValue(this.plugin.settings.enableSessionTracking)
						.onChange(async (value) => {
							this.plugin.settings.enableSessionTracking = value;
							await this.plugin.saveSettings();
							if (value && !this.plugin.currentSession) {
								this.plugin.startStudySession();
							}
						}));

				if (this.plugin.settings.enableSessionTracking && this.plugin.settings.studyStreak > 0) {
					const streakDisplay = content.createDiv({ cls: 'bp-settings-stats' });
					const streakCard = streakDisplay.createDiv({ cls: 'bp-settings-stat-card' });
					streakCard.createDiv({ text: `${this.plugin.settings.studyStreak}`, cls: 'stat-value' });
					streakCard.createDiv({ text: 'Day streak 🔥', cls: 'stat-label' });
				}

				// Onboarding reset
				const onboardingGroup = content.createDiv({ cls: 'bp-settings-group' });
				onboardingGroup.createEl('div', { text: 'Feature discovery', cls: 'bp-settings-group-title' });

				new Setting(content)
					.setName('Reset onboarding hints')
					.setDesc('Show the feature discovery hints bar again')
					.addButton(button => button
						.setButtonText('Reset hints')
						.onClick(async () => {
							this.plugin.settings.onboardingComplete = false;
							await this.plugin.saveSettings();
							new Notice('Onboarding hints will show on next view');
						}));
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 10: Data Management
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'data-management',
			icon: 'database',
			title: 'Data management',
			purpose: 'Download Bible translations, convert markdown files, and manage your study data.',
			content: (content) => {
				// Bible Downloader
				const downloadGroup = content.createDiv({ cls: 'bp-settings-group' });
				downloadGroup.createEl('div', { text: 'Download translations', cls: 'bp-settings-group-title' });

				const downloadPurpose = downloadGroup.createDiv({ cls: 'bp-settings-purpose' });
				downloadPurpose.textContent = 'Download Bible translations from the Bolls Life API. Choose from 50+ translations in multiple languages.';

				const downloadActions = content.createDiv({ cls: 'bp-settings-actions' });
				const downloadBtn = downloadActions.createEl('button', { text: 'Download Bible', cls: 'action-primary' });
				downloadBtn.addEventListener('click', async () => {
					await this.plugin.downloadBibleTranslation((step, message, percent) => {
						if (step === 'complete') {
							new Notice('✅ Bible downloaded!');
							this.display();
						} else if (step === 'error') {
							new Notice(`Error: ${message}`);
						}
					});
				});

				// Import/Export
				const importExportGroup = content.createDiv({ cls: 'bp-settings-group' });
				importExportGroup.createEl('div', { text: 'Import & Export', cls: 'bp-settings-group-title' });

				const importExportPurpose = importExportGroup.createDiv({ cls: 'bp-settings-purpose' });
				importExportPurpose.textContent = 'Backup your highlight colors or transfer them to another vault.';

				const importExportActions = content.createDiv({ cls: 'bp-settings-actions' });

				const exportColorsBtn = importExportActions.createEl('button', { text: 'Export colors', cls: 'action-secondary' });
				exportColorsBtn.addEventListener('click', async () => {
					const exportData = {
						exportDate: new Date().toISOString(),
						version: '1.0',
						highlightColors: this.plugin.settings.highlightColors
					};
					const json = JSON.stringify(exportData, null, 2);
					const blob = new Blob([json], { type: 'application/json' });
					const url = URL.createObjectURL(blob);
					const a = document.createElement('a');
					a.href = url;
					a.download = `bible-highlight-colors-${new Date().toISOString().split('T')[0]}.json`;
					a.click();
					URL.revokeObjectURL(url);
					new Notice(`Exported ${this.plugin.settings.highlightColors.length} colors`);
				});

				const importColorsBtn = importExportActions.createEl('button', { text: 'Import colors', cls: 'action-secondary' });
				importColorsBtn.addEventListener('click', async () => {
					const input = document.createElement('input');
					input.type = 'file';
					input.accept = '.json';
					input.onchange = async (e: Event) => {
						const target = e.target as HTMLInputElement;
						const file = target.files?.[0];
						if (!file) return;
						try {
							const text = await file.text();
							const importData = JSON.parse(text);
							if (!importData.highlightColors || !Array.isArray(importData.highlightColors)) {
								new Notice('Invalid file format');
								return;
							}
							this.plugin.settings.highlightColors = importData.highlightColors;
							await this.plugin.saveSettings();
							this.display();
							new Notice(`Imported ${importData.highlightColors.length} colors`);
						} catch (error) {
							new Notice('Failed to import');
						}
					};
					input.click();
				});
			}
		});

		// ═══════════════════════════════════════════════════════════════
		// SECTION 11: About
		// ═══════════════════════════════════════════════════════════════
		this.createSection(containerEl, {
			id: 'about',
			icon: 'info',
			title: 'About Bible Portal',
			purpose: '',
			content: (content) => {
				const about = content.createDiv({ cls: 'bp-settings-about' });

				about.createDiv({ text: '📖', cls: 'about-logo' });
				about.createEl('h3', { text: 'Bible Portal', cls: 'about-title' });
				about.createEl('p', { text: 'Version 1.5.0', cls: 'about-version' });
				about.createEl('p', {
					text: 'A comprehensive Bible study plugin for Obsidian with multi-version support, cross-references, Strong\'s Concordance, and contextual metadata.',
					cls: 'about-description'
				});

				// Features grid
				const features = [
					'Multi-version Bible reading',
					'Parallel view comparison',
					'Strong\'s Concordance',
					'Cross-references',
					'Theographic metadata',
					'Jesus words in red',
					'Highlighting & layers',
					'Notes system',
					'Verse tagging',
					'Word concordance',
					'Reading plans',
					'Memorization mode'
				];

				const featuresGrid = about.createDiv({ cls: 'bp-settings-features-grid' });
				features.forEach(feature => {
					const item = featuresGrid.createDiv({ cls: 'bp-settings-feature-item' });
					setIcon(item.createSpan(), 'check');
					item.createSpan({ text: feature });
				});

				// Credits
				const creditsGroup = content.createDiv({ cls: 'bp-settings-group' });
				creditsGroup.createEl('div', { text: 'Data sources & licenses', cls: 'bp-settings-group-title' });

				const creditsList = creditsGroup.createEl('ul');
				creditsList.style.fontSize = '13px';
				creditsList.style.color = 'var(--text-muted)';

				const credits = [
					{ name: 'Cross-References', source: 'josephilipraja/bible-cross-reference-json', license: 'GPL-2.0' },
					{ name: 'Theographic Metadata', source: 'robertrouse/theographic-bible-metadata', license: 'CC BY-SA 4.0' },
					{ name: 'Strong\'s Concordance', source: 'Public Domain', license: '' }
				];

				credits.forEach(credit => {
					const li = creditsList.createEl('li');
					li.createEl('strong', { text: `${credit.name}: ` });
					li.appendText(credit.source);
					if (credit.license) {
						li.appendText(` (${credit.license})`);
					}
				});

				about.createEl('p', {
					text: 'Developed by Stephen',
					cls: 'about-description'
				});
			}
		});
	}

	// Helper to create collapsible sections
	private createSection(container: HTMLElement, options: {
		id: string;
		icon: string;
		title: string;
		badge?: string;
		purpose: string;
		content: (content: HTMLElement) => void;
	}) {
		const section = container.createDiv({ cls: 'bp-settings-section' });
		section.dataset.sectionId = options.id;

		if (this.collapsedSections.has(options.id)) {
			section.addClass('collapsed');
		}

		// Header
		const header = section.createDiv({ cls: 'bp-settings-section-header' });

		const iconDiv = header.createDiv({ cls: 'section-icon' });
		setIcon(iconDiv, options.icon);

		const titleGroup = header.createDiv({ cls: 'section-title-group' });
		const titleEl = titleGroup.createEl('span', { text: options.title, cls: 'section-title' });

		if (options.badge) {
			titleGroup.createEl('span', { text: options.badge, cls: 'section-badge' });
		}

		const chevron = header.createDiv({ cls: 'section-chevron' });
		setIcon(chevron, 'chevron-down');

		// Toggle collapse
		header.addEventListener('click', () => {
			if (this.collapsedSections.has(options.id)) {
				this.collapsedSections.delete(options.id);
				section.removeClass('collapsed');
			} else {
				this.collapsedSections.add(options.id);
				section.addClass('collapsed');
			}
		});

		// Content
		const content = section.createDiv({ cls: 'bp-settings-section-content' });

		if (options.purpose) {
			content.createDiv({ text: options.purpose, cls: 'bp-settings-purpose' });
		}

		options.content(content);
	}

	// Filter settings by search query
	private filterSettings(container: HTMLElement, query: string) {
		const sections = container.querySelectorAll('.bp-settings-section');
		sections.forEach(section => {
			const text = section.textContent?.toLowerCase() || '';
			if (query === '' || text.includes(query)) {
				(section as HTMLElement).style.display = '';
			} else {
				(section as HTMLElement).style.display = 'none';
			}
		});
	}
}

/**
 * Modal for confirmation dialogs (replaces browser confirm())
 */
class ConfirmModal extends Modal {
	private title: string
	private message: string
	private confirmText: string
	private cancelText: string
	private isDestructive: boolean
	private onConfirm: () => void
	private onCancel: () => void

	constructor(
		app: App,
		options: {
			title: string
			message: string
			confirmText?: string
			cancelText?: string
			isDestructive?: boolean
			onConfirm: () => void
			onCancel: () => void
		}
	) {
		super(app)
		this.title = options.title
		this.message = options.message
		this.confirmText = options.confirmText || 'Confirm'
		this.cancelText = options.cancelText || 'Cancel'
		this.isDestructive = options.isDestructive || false
		this.onConfirm = options.onConfirm
		this.onCancel = options.onCancel
	}

	onOpen(): void {
		const { contentEl } = this
		contentEl.empty()
		contentEl.addClass('confirm-modal')

		contentEl.createEl('h3', { text: this.title })
		contentEl.createEl('p', { text: this.message })

		const buttonContainer = contentEl.createDiv({ cls: 'confirm-modal-buttons' })

		const cancelBtn = buttonContainer.createEl('button', { text: this.cancelText })
		cancelBtn.addEventListener('click', () => {
			this.close()
			this.onCancel()
		})

		const confirmBtn = buttonContainer.createEl('button', {
			text: this.confirmText,
			cls: this.isDestructive ? 'mod-warning' : 'mod-cta'
		})
		confirmBtn.addEventListener('click', () => {
			this.close()
			this.onConfirm()
		})
	}

	onClose(): void {
		const { contentEl } = this
		contentEl.empty()
	}
}

/**
 * Helper function to show a confirmation modal and return a promise
 */
function showConfirmModal(
	app: App,
	title: string,
	message: string,
	options?: {
		confirmText?: string
		cancelText?: string
		isDestructive?: boolean
	}
): Promise<boolean> {
	return new Promise((resolve) => {
		new ConfirmModal(app, {
			title,
			message,
			confirmText: options?.confirmText,
			cancelText: options?.cancelText,
			isDestructive: options?.isDestructive,
			onConfirm: () => resolve(true),
			onCancel: () => resolve(false)
		}).open()
	})
}

/**
 * Modal for showing download progress
 */
class DownloadProgressModal extends Modal {
	private titleText: string;
	private statusEl: HTMLElement;
	private progressBar: HTMLElement;
	private progressFill: HTMLElement;
	private closeBtn: HTMLElement;

	constructor(app: App, title: string) {
		super(app);
		this.titleText = title;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('download-progress-modal');

		// Title
		contentEl.createEl('h2', { text: this.titleText });

		// Progress bar container
		this.progressBar = contentEl.createDiv({ cls: 'download-progress-bar' });
		this.progressFill = this.progressBar.createDiv({ cls: 'download-progress-fill' });
		this.progressFill.style.width = '0%';

		// Status text
		this.statusEl = contentEl.createEl('p', { text: 'Starting download...', cls: 'download-status' });

		// Close button (hidden initially)
		this.closeBtn = contentEl.createEl('button', { text: 'Close', cls: 'download-close-btn' });
		this.closeBtn.style.display = 'none';
		this.closeBtn.addEventListener('click', () => this.close());
	}

	setProgress(percent: number) {
		this.progressFill.style.width = `${percent}%`;
	}

	setStatus(message: string) {
		this.statusEl.textContent = message;
	}

	setComplete(message: string) {
		this.progressFill.style.width = '100%';
		this.progressFill.addClass('complete');
		this.statusEl.textContent = message;
		this.closeBtn.style.display = 'block';
	}

	setError(message: string) {
		this.progressFill.addClass('error');
		this.statusEl.textContent = message;
		this.statusEl.addClass('error');
		this.closeBtn.style.display = 'block';
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Modal for displaying detailed Theographic information
 */
class TheographicDetailModal extends Modal {
	private type: 'person' | 'place' | 'event';
	private data: TheographicPerson | TheographicPlace | TheographicEvent;
	private plugin: BiblePortalPlugin;
	private view: BibleView;

	constructor(
		app: App,
		type: 'person' | 'place' | 'event',
		data: TheographicPerson | TheographicPlace | TheographicEvent,
		plugin: BiblePortalPlugin,
		view: BibleView
	) {
		super(app);
		this.type = type;
		this.data = data;
		this.plugin = plugin;
		this.view = view;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('theographic-detail-modal');

		if (this.type === 'person') {
			this.renderPersonDetails(contentEl, this.data as TheographicPerson);
		} else if (this.type === 'place') {
			this.renderPlaceDetails(contentEl, this.data as TheographicPlace);
		} else if (this.type === 'event') {
			this.renderEventDetails(contentEl, this.data as TheographicEvent);
		}

		// Close button
		const closeBtn = contentEl.createEl('button', {
			text: 'Close',
			cls: 'theographic-modal-close'
		});
		closeBtn.addEventListener('click', () => this.close());
	}

	/**
	 * Find all verses that mention this person/place/event
	 */
	findVerses(): TheographicVerse[] {
		const id = this.data.id; // Airtable record ID
		const verses: TheographicVerse[] = [];

		if (!this.plugin.theographicData.verses) return verses;

		for (const verse of this.plugin.theographicData.verses) {
			let found = false;

			if (this.type === 'person' && verse.fields.people?.includes(id)) {
				found = true;
			} else if (this.type === 'place' && verse.fields.places?.includes(id)) {
				found = true;
			} else if (this.type === 'event' && verse.fields.event?.includes(id)) {
				found = true;
			}

			if (found) {
				verses.push(verse);
			}
		}

		return verses;
	}

	renderPersonDetails(container: HTMLElement, person: TheographicPerson) {
		// Header
		const header = container.createDiv({ cls: 'theographic-modal-header' });
		header.createEl('h2', {
			text: person.fields.displayTitle || person.fields.name,
			cls: 'theographic-modal-title'
		});

		// Metadata
		const metadata = container.createDiv({ cls: 'theographic-modal-metadata' });

		if (person.fields.gender) {
			metadata.createDiv({
				text: `Gender: ${person.fields.gender}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (person.fields.minYear && person.fields.maxYear) {
			const birthYear = person.fields.minYear < 0 ? `${Math.abs(person.fields.minYear)} BC` : `${person.fields.minYear} AD`;
			const deathYear = person.fields.maxYear < 0 ? `${Math.abs(person.fields.maxYear)} BC` : `${person.fields.maxYear} AD`;
			metadata.createDiv({
				text: `Life: ${birthYear} - ${deathYear}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (person.fields.verseCount) {
			metadata.createDiv({
				text: `Mentioned in ${person.fields.verseCount} verses`,
				cls: 'theographic-modal-meta-item'
			});
		}

		// Biography (if available)
		if (person.fields.dictionaryText) {
			const bioSection = container.createDiv({ cls: 'theographic-modal-section' });
			bioSection.createEl('h3', { text: 'Biography', cls: 'theographic-modal-section-title' });
			const bioText = bioSection.createDiv({ cls: 'theographic-modal-bio' });
			// Truncate if very long
			const text = person.fields.dictionaryText;
			const truncated = text.length > 500 ? text.substring(0, 500) + '...' : text;
			bioText.setText(truncated);
		}

		// Verses section
		const verses = this.findVerses();
		if (verses.length > 0) {
			const versesSection = container.createDiv({ cls: 'theographic-modal-section' });
			versesSection.createEl('h3', {
				text: `Verses (${verses.length})`,
				cls: 'theographic-modal-section-title'
			});

			const versesList = versesSection.createDiv({ cls: 'theographic-modal-verses-list' });

			// Limit to first 20 verses to avoid overwhelming the modal
			const displayVerses = verses.slice(0, 20);
			displayVerses.forEach(verse => {
				const verseRef = versesList.createDiv({ cls: 'theographic-modal-verse-ref' });
				verseRef.setText(verse.fields.osisRef);
				verseRef.style.cursor = 'pointer';
				verseRef.addEventListener('click', () => {
					this.close();
					this.view.navigateToVerse(verse.fields.osisRef);
				});
			});

			if (verses.length > 20) {
				versesList.createDiv({
					text: `... and ${verses.length - 20} more verses`,
					cls: 'theographic-modal-verse-more'
				});
			}
		}

		// Attribution
		container.createDiv({
			text: 'Source: Theographic Bible Metadata (CC BY-SA 4.0)',
			cls: 'theographic-modal-attribution'
		});
	}

	renderPlaceDetails(container: HTMLElement, place: TheographicPlace) {
		// Header
		const header = container.createDiv({ cls: 'theographic-modal-header' });
		header.createEl('h2', {
			text: place.fields.displayTitle,
			cls: 'theographic-modal-title'
		});

		// Metadata
		const metadata = container.createDiv({ cls: 'theographic-modal-metadata' });

		if (place.fields.featureType) {
			metadata.createDiv({
				text: `Type: ${place.fields.featureType}${place.fields.featureSubType ? ` (${place.fields.featureSubType})` : ''}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (place.fields.latitude && place.fields.longitude) {
			metadata.createDiv({
				text: `Coordinates: ${place.fields.latitude}, ${place.fields.longitude}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (place.fields.comment) {
			metadata.createDiv({
				text: place.fields.comment,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (place.fields.verseCount) {
			metadata.createDiv({
				text: `Mentioned in ${place.fields.verseCount} verses`,
				cls: 'theographic-modal-meta-item'
			});
		}

		// Description (if available)
		if (place.fields.dictText && place.fields.dictText.length > 0) {
			const descSection = container.createDiv({ cls: 'theographic-modal-section' });
			descSection.createEl('h3', { text: 'Description', cls: 'theographic-modal-section-title' });
			const descText = descSection.createDiv({ cls: 'theographic-modal-bio' });
			descText.setText(place.fields.dictText.join('\n\n'));
		}

		// Verses section
		const verses = this.findVerses();
		if (verses.length > 0) {
			const versesSection = container.createDiv({ cls: 'theographic-modal-section' });
			versesSection.createEl('h3', {
				text: `Verses (${verses.length})`,
				cls: 'theographic-modal-section-title'
			});

			const versesList = versesSection.createDiv({ cls: 'theographic-modal-verses-list' });

			// Limit to first 20 verses to avoid overwhelming the modal
			const displayVerses = verses.slice(0, 20);
			displayVerses.forEach(verse => {
				const verseRef = versesList.createDiv({ cls: 'theographic-modal-verse-ref' });
				verseRef.setText(verse.fields.osisRef);
				verseRef.style.cursor = 'pointer';
				verseRef.addEventListener('click', () => {
					this.close();
					this.view.navigateToVerse(verse.fields.osisRef);
				});
			});

			if (verses.length > 20) {
				versesList.createDiv({
					text: `... and ${verses.length - 20} more verses`,
					cls: 'theographic-modal-verse-more'
				});
			}
		}

		// Attribution
		container.createDiv({
			text: 'Source: Theographic Bible Metadata (CC BY-SA 4.0)',
			cls: 'theographic-modal-attribution'
		});
	}

	renderEventDetails(container: HTMLElement, event: TheographicEvent) {
		// Header
		const header = container.createDiv({ cls: 'theographic-modal-header' });
		header.createEl('h2', {
			text: event.fields.title,
			cls: 'theographic-modal-title'
		});

		// Metadata
		const metadata = container.createDiv({ cls: 'theographic-modal-metadata' });

		if (event.fields.startDate) {
			const year = parseInt(event.fields.startDate);
			const dateText = year < 0 ? `${Math.abs(year)} BC` : `${year} AD`;
			metadata.createDiv({
				text: `Date: ${dateText}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		if (event.fields.duration) {
			metadata.createDiv({
				text: `Duration: ${event.fields.duration}`,
				cls: 'theographic-modal-meta-item'
			});
		}

		// Verses section
		const verses = this.findVerses();
		if (verses.length > 0) {
			const versesSection = container.createDiv({ cls: 'theographic-modal-section' });
			versesSection.createEl('h3', {
				text: `Verses (${verses.length})`,
				cls: 'theographic-modal-section-title'
			});

			const versesList = versesSection.createDiv({ cls: 'theographic-modal-verses-list' });

			// Limit to first 20 verses to avoid overwhelming the modal
			const displayVerses = verses.slice(0, 20);
			displayVerses.forEach(verse => {
				const verseRef = versesList.createDiv({ cls: 'theographic-modal-verse-ref' });
				verseRef.setText(verse.fields.osisRef);
				verseRef.style.cursor = 'pointer';
				verseRef.addEventListener('click', () => {
					this.close();
					this.view.navigateToVerse(verse.fields.osisRef);
				});
			});

			if (verses.length > 20) {
				versesList.createDiv({
					text: `... and ${verses.length - 20} more verses`,
					cls: 'theographic-modal-verse-more'
				});
			}
		}

		// Attribution
		container.createDiv({
			text: 'Source: Theographic Bible Metadata (CC BY-SA 4.0)',
			cls: 'theographic-modal-attribution'
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

/**
 * Simple input modal for prompting user input
 */
class InputModal extends Modal {
	private title: string;
	private placeholder: string;
	private defaultValue: string;
	private onSubmit: (value: string) => void;

	constructor(
		app: App,
		title: string,
		placeholder: string,
		defaultValue: string,
		onSubmit: (value: string) => void
	) {
		super(app);
		this.title = title;
		this.placeholder = placeholder;
		this.defaultValue = defaultValue;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: this.title });

		const inputEl = contentEl.createEl('input', {
			type: 'text',
			placeholder: this.placeholder,
			value: this.defaultValue
		});
		inputEl.style.width = '100%';
		inputEl.style.padding = '8px';
		inputEl.style.marginBottom = '12px';

		// Auto-focus and select
		setTimeout(() => {
			inputEl.focus();
			inputEl.select();
		}, 10);

		// Submit on Enter
		inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter') {
				this.onSubmit(inputEl.value);
				this.close();
			} else if (e.key === 'Escape') {
				this.onSubmit('');
				this.close();
			}
		});

		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
		buttonContainer.style.display = 'flex';
		buttonContainer.style.justifyContent = 'flex-end';
		buttonContainer.style.gap = '8px';
		buttonContainer.style.marginTop = '12px';

		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.onSubmit('');
			this.close();
		});

		const submitButton = buttonContainer.createEl('button', { text: 'OK', cls: 'mod-cta' });
		submitButton.addEventListener('click', () => {
			this.onSubmit(inputEl.value);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
