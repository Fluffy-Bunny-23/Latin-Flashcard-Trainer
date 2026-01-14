import json
import re
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_FILE = os.path.join(SCRIPT_DIR, 'words.txt')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'words.json')

def parse_line(line):
    # Normalize dash
    line = line.replace('–', '-')
    
    parts = line.split(' - ')
    if len(parts) < 2:
        return None
    
    latin_part = parts[0].strip()
    english_part = parts[1].strip()
    
    latin = latin_part
    translation = english_part
    pos = ""
    gender = ""
    
    # Heuristic to detect Format A vs Format B
    # Format A: POS is in parentheses in latin_part. e.g. "word (noun)"
    # Format B: POS is at the end of english_part, separated by comma. e.g. "definition, noun"
    
    # Updated regex to match only the LAST parenthesized group for POS
    pos_match = re.search(r'\s*\(([^)]+)\)$', latin_part)
    
    if pos_match:
        # Format A
        pos = pos_match.group(1)
        latin = latin_part[:pos_match.start()].strip()
        translation = english_part
    else:
        # Format B
        # Check if english part has a comma for POS
        last_comma_index = english_part.rfind(',')
        if last_comma_index != -1:
            potential_pos = english_part[last_comma_index+1:].strip()
            # Heuristic: POS is usually short (one word) or standard abbreviation
            # if potential_pos len < 15?
            pos = potential_pos
            translation = english_part[:last_comma_index].strip()
        else:
            # Fallback
            pass

    # Extract gender from latin part
    # Look for specific gender markers at the end of the string
    # Split by comma and check last part
    latin_tokens = latin.split(',')
    if len(latin_tokens) > 1:
        last_token = latin_tokens[-1].strip()
        # Check if last token is a gender marker
        # m., f., n., m./f., c., m. pl., f. pl., n. pl., etc.
        # Also just 'm', 'f' sometimes? Text file has "m.", "f." usually.
        # Regex to match gender markers strictly
        if re.match(r'^(m\.|f\.|n\.|c\.|m\/f|m\./f\.|pl\.|m\. pl\.|f\. pl\.|n\. pl\.)$', last_token):
             gender = last_token
             latin = ",".join(latin_tokens[:-1]).strip()
        # Also handle "m. (noun)" case if generic regex failed before? No, POS handled above.
        # What about "frāter, frātris, m." -> tokens: ["frāter", " frātris", " m."] -> last is "m." -> MATCH.
        # "ego, meī" -> tokens: ["ego", " meī"] -> last "meī". NO MATCH.
    
    return {
        "latin": latin,
        "translation": translation,
        "pos": pos,
        "gender": gender
    }

def main():
    chapters = []
    current_chapter = None

    # Check if input file exists
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Input file '{INPUT_FILE}' not found.")
        print(f"Please ensure the file exists in the words directory.")
        sys.exit(1)

    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except IOError as e:
        print(f"Error: Unable to read input file '{INPUT_FILE}'.")
        print(f"Details: {e}")
        sys.exit(1)
    except UnicodeDecodeError as e:
        print(f"Error: Unable to decode input file '{INPUT_FILE}'.")
        print(f"Details: {e}")
        print("Please ensure the file is UTF-8 encoded.")
        sys.exit(1)
        
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.upper().startswith("CHAPTER"):
            if current_chapter:
                chapters.append(current_chapter)
            chapter_title = re.sub(r'\bCHAPTER\b', 'Chapter', line, flags=re.IGNORECASE)

            # Replace number words with digits using a dictionary
            number_words = {
                'ONE': '1',
                'TWO': '2',
                'THREE': '3',
                'FOUR': '4',
                'FIVE': '5',
                'SIX': '6',
                'SEVEN': '7',
                'EIGHT': '8',
                'NINE': '9',
                'TEN': '10',
                'ELEVEN': '11',
                'TWELVE': '12',
                'THIRTEEN': '13',
                'FOURTEEN': '14',
                'FIFTEEN': '15',
                'SIXTEEN': '16',
                'SEVENTEEN': '17',
                'EIGHTEEN': '18',
                'NINETEEN': '19'
            }

            for word, digit in number_words.items():
                chapter_title = re.sub(rf'\b{word}\b', digit, chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bVOCABULARY\b', '', chapter_title, flags=re.IGNORECASE).strip()
            current_chapter = {
                "chapter": chapter_title,
                "words": []
            }
            continue
            
        # Skip parsing if we haven't found a chapter yet
        if current_chapter is None:
            continue
            
        # Skip chant lines if they don't follow standard format (optional heuristic)
        # e.g. "-bam, -bās..."
        # But the user said "Convert the words... translation...". 
        # Chants usually have translations in this file?
        # Let's see: "-bam ... – Imperfect Tense Chant"
        # My parser looks for " - ".
        # " - " exists there.
        # latin="-bam..."
        # english="Imperfect Tense Chant"
        # It won't match POS parens. It will fall to Format B.
        # english="Imperfect Tense Chant". No comma. pos=""
        # This seems acceptable.
        
        word_data = parse_line(line)
        if word_data:
            current_chapter["words"].append(word_data)
            
    if current_chapter:
        chapters.append(current_chapter)
    else:
        print("Warning: No chapters found in the input file.")
        return

    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(chapters, f, indent=4, ensure_ascii=False)
    except IOError as e:
        print(f"Error: Unable to write output file '{OUTPUT_FILE}'.")
        print(f"Details: {e}")
        sys.exit(1)

    # Also create a compressed version
    compressed_file = os.path.join(SCRIPT_DIR, '..', 'data.js')
    try:
        with open(compressed_file, 'w', encoding='utf-8') as f:
            f.write('var wordsData = ')
            json.dump(chapters, f, ensure_ascii=True)
            f.write(';')
    except IOError as e:
        print(f"Error: Unable to write compressed file '{compressed_file}'.")
        print(f"Details: {e}")
        sys.exit(1)

    print(f"Successfully converted {len(chapters)} chapters.")
    print(f"Output files created:")
    print(f"  - {OUTPUT_FILE}")
    print(f"  - {compressed_file}")

if __name__ == "__main__":
    main()
