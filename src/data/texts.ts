import { DifficultyLevel, TimerOption } from '@/types'

// Topic-specific word pools for meaningful text generation
const TOPIC_WORDS = {
  easy: {
    animals: ['cat', 'dog', 'bird', 'fish', 'cow', 'pig', 'duck', 'frog', 'bee', 'ant'],
    actions: ['run', 'jump', 'walk', 'sit', 'eat', 'sleep', 'play', 'look', 'move', 'stop'],
    places: ['home', 'park', 'yard', 'room', 'bed', 'car', 'tree', 'hill', 'lake', 'road'],
    times: ['day', 'night', 'morning', 'today', 'now', 'later', 'soon', 'then', 'first', 'last'],
    objects: ['book', 'ball', 'cup', 'box', 'bag', 'toy', 'pen', 'hat', 'key', 'map'],
    people: ['man', 'woman', 'boy', 'girl', 'mom', 'dad', 'kid', 'baby', 'friend', 'person'],
    colors: ['red', 'blue', 'green', 'black', 'white', 'brown', 'pink', 'gray', 'gold', 'dark'],
    sizes: ['big', 'small', 'long', 'short', 'tall', 'wide', 'thin', 'huge', 'tiny', 'full'],
    qualities: ['good', 'bad', 'nice', 'happy', 'sad', 'fast', 'slow', 'hot', 'cold', 'new']
  },
  medium: {
    subjects: ['technology', 'education', 'business', 'health', 'travel', 'culture', 'music', 'sports', 'food', 'nature'],
    actions: ['develop', 'create', 'manage', 'organize', 'research', 'discover', 'improve', 'connect', 'support', 'explore'],
    qualities: ['important', 'successful', 'creative', 'efficient', 'popular', 'modern', 'traditional', 'innovative', 'reliable', 'flexible'],
    places: ['office', 'university', 'hospital', 'restaurant', 'airport', 'museum', 'library', 'theater', 'stadium', 'market'],
    people: ['students', 'teachers', 'doctors', 'engineers', 'artists', 'musicians', 'athletes', 'writers', 'scientists', 'professionals'],
    concepts: ['knowledge', 'experience', 'opportunity', 'challenge', 'solution', 'progress', 'success', 'development', 'communication', 'information'],
    tools: ['computer', 'software', 'internet', 'database', 'system', 'network', 'platform', 'application', 'device', 'equipment']
  },
  hard: {
    fields: ['neuroscience', 'biotechnology', 'astrophysics', 'archaeology', 'psychology', 'philosophy', 'economics', 'linguistics', 'anthropology', 'sociology'],
    processes: ['implementation', 'transformation', 'optimization', 'configuration', 'interpretation', 'experimentation', 'investigation', 'collaboration', 'specialization', 'systematization'],
    qualities: ['comprehensive', 'sophisticated', 'revolutionary', 'unprecedented', 'extraordinary', 'fundamental', 'theoretical', 'experimental', 'controversial', 'phenomenological'],
    concepts: ['consciousness', 'methodology', 'infrastructure', 'architecture', 'administration', 'organization', 'responsibility', 'characteristic', 'understanding', 'communication'],
    outcomes: ['advancement', 'achievement', 'breakthrough', 'discovery', 'innovation', 'development', 'establishment', 'recognition', 'transformation', 'realization'],
    institutions: ['university', 'laboratory', 'organization', 'administration', 'institution', 'corporation', 'establishment', 'foundation', 'association', 'confederation']
  }
}

// Sentence templates for each difficulty level
const TEMPLATES = {
  easy: [
    'the [animals] [actions] in the [places] when it gets [times]',
    '[people] like to [actions] with their [objects] every [times]',
    'a [colors] [animals] [actions] near the [places] and looks [qualities]',
    'when [people] [actions] they feel [qualities] and [actions] more',
    'the [sizes] [objects] sits on the [places] all [times] long',
    '[people] can [actions] and [actions] when they have [objects]',
    'every [times] the [animals] [actions] around the [places] quickly',
    'most [people] [actions] their [objects] in the [places] at [times]'
  ],
  medium: [
    'During [times], [people] typically [actions] their [concepts] through [tools].',
    'Modern [subjects] helps [people] [actions] more [qualities] solutions for daily challenges.',
    'Many [people] visit [places] to [actions] new [concepts] and gain valuable experience.',
    'Technology allows [people] to [actions] and [actions] their work more efficiently.',
    'Students can [actions] important [concepts] by using various [tools] and methods.',
    'Professional [people] often [actions] in [places] to discuss [qualities] projects.',
    'Research shows that [subjects] continues to [actions] and transform modern society.',
    'Organizations [actions] new [tools] to improve their [concepts] and reach better results.'
  ],
  hard: [
    'Contemporary [fields] demonstrates [qualities] [concepts] that facilitate systematic [processes].',
    'Researchers [actions] [qualities] methodologies to investigate complex [concepts] within academic [institutions].',
    'Advanced [processes] requires comprehensive understanding of [qualities] theoretical frameworks.',
    'Modern [institutions] implement sophisticated [tools] to optimize their organizational [processes].',
    'Scientific [fields] continues to [actions] unprecedented [outcomes] through collaborative research initiatives.',
    'Theoretical [concepts] underlying [qualities] [processes] represents fundamental advances in human knowledge.',
    'Academic [institutions] facilitate [qualities] [processes] by providing comprehensive resources and expertise.',
    'Revolutionary [outcomes] in [fields] demonstrates the extraordinary potential of systematic [processes].'
  ]
}

// Fill template with random words from topic pools
function fillTemplate(template: string, difficulty: DifficultyLevel): string {
  const topicWords = TOPIC_WORDS[difficulty]
  
  return template.replace(/\[(\w+)\]/g, (match, category) => {
    const categoryWords = topicWords[category as keyof typeof topicWords] as string[]
    if (!categoryWords || categoryWords.length === 0) return match // Return original if category not found
    
    const randomWord = categoryWords[Math.floor(Math.random() * categoryWords.length)]
    return randomWord
  })
}

// Apply difficulty-specific formatting rules
function applyFormatting(text: string, difficulty: DifficultyLevel): string {
  if (difficulty === 'easy') {
    // Easy: only lowercase, no punctuation
    return text.toLowerCase().replace(/[.,!?]/g, '')
  } else if (difficulty === 'medium' || difficulty === 'hard') {
    // Medium/Hard: proper English grammar and capitalization
    let formatted = text.toLowerCase()
    
    // Capitalize first letter of the text
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1)
    
    // Capitalize after periods (sentence beginnings)
    formatted = formatted.replace(/\.\s+([a-z])/g, (_, letter) => {
      return '. ' + letter.toUpperCase()
    })
    
    // Capitalize proper nouns and important words (but keep it natural)
    // Only capitalize specific words that should be capitalized in English
    const wordsToCapitalize = [
      'america', 'american', 'english', 'internet', 'technology', 'students', 
      'university', 'college', 'government', 'research', 'science', 'education',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
      'september', 'october', 'november', 'december'
    ]
    
    wordsToCapitalize.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      formatted = formatted.replace(regex, (match) => 
        match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
      )
    })
    
    return formatted
  }
  
  return text
}

// Generate text with exact word count using templates
function generateText(difficulty: DifficultyLevel, targetWordCount: number): string {
  const templates = TEMPLATES[difficulty]
  const sentences: string[] = []
  let currentWordCount = 0
  
  // Keep generating sentences until we reach target word count
  while (currentWordCount < targetWordCount) {
    // Pick random template
    const template = templates[Math.floor(Math.random() * templates.length)]
    
    // Fill template with topic words
    let sentence = fillTemplate(template, difficulty)
    
    // Apply formatting rules
    sentence = applyFormatting(sentence, difficulty)
    
    // Count words in this sentence
    const sentenceWords = sentence.split(' ').filter(word => word.length > 0)
    const sentenceWordCount = sentenceWords.length
    
    // Check if adding this sentence would exceed target
    if (currentWordCount + sentenceWordCount <= targetWordCount) {
      sentences.push(sentence)
      currentWordCount += sentenceWordCount
    } else {
      // Need to trim the sentence to fit exactly
      const wordsNeeded = targetWordCount - currentWordCount
      const trimmedSentence = sentenceWords.slice(0, wordsNeeded).join(' ')
      sentences.push(trimmedSentence)
      currentWordCount = targetWordCount
      break
    }
  }
  
  return sentences.join(' ')
}


export function getRandomText(difficulty: DifficultyLevel, timer: TimerOption): string {
  const wordCount = timer === 1 ? 70 : timer === 2 ? 120 : 300
  return generateText(difficulty, wordCount)
}