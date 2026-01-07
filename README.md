# Latin Flashcard Trainer

A tool for managing and converting Latin vocabulary for flashcard study. This project provides a script to parse Latin word lists into a structured JSON format, organized by chapter.

## Project Structure

- `words/words.txt`: The source text file containing Latin vocabulary words, parts of speech, and English translations.
- `words/words.json`: The generated JSON file containing the structured vocabulary data.
- `words/convert_words.py`: A Python script that parses `words.txt` and updates `words.json`.
- `README.md`: This file, providing an overview of the project.

## Usage

View the website (here)[https://lazypanda5050.github.io/Latin-Flashcard-Trainer]

### Converting Vocabulary

To convert the `words.txt` file into `words.json`, run the following command from the project root:

```bash
python3 words/convert_words.py
```

### Input Format (`words/words.txt`)

The script expects words to be grouped by chapters, with lines formatted as:

`Latin Word(s) (Part of Speech) – English Translation`

Example:
`frāter, frātris, m. (noun) – brother`

### Output Format (`words/words.json`)

The output is a JSON array of chapter objects, each containing a list of words with their Latin forms, translation, part of speech, and gender (if applicable).

```json
[
    {
        "chapter": "CHAPTER ONE VOCABULARY",
        "words": [
            {
                "latin": "frāter, frātris",
                "translation": "brother",
                "pos": "noun",
                "gender": "m."
            }
        ]
    }
]
```
