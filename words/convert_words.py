import json
import re
import os

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
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.upper().startswith("CHAPTER"):
            if current_chapter:
                chapters.append(current_chapter)
            chapter_title = re.sub(r'\bCHAPTER\b', 'Chapter', line, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bONE\b', '1', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bTWO\b', '2', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bTHREE\b', '3', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bFOUR\b', '4', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bFIVE\b', '5', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bSIX\b', '6', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bSEVEN\b', '7', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bEIGHT\b', '8', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bNINE\b', '9', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bTEN\b', '10', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bELEVEN\b', '11', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bTWELVE\b', '12', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bTHIRTEEN\b', '13', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bFOURTEEN\b', '14', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bFIFTEEN\b', '15', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bSIXTEEN\b', '16', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bSEVENTEEN\b', '17', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bEIGHTEEN\b', '18', chapter_title, flags=re.IGNORECASE)
            chapter_title = re.sub(r'\bNINETEEN\b', '19', chapter_title, flags=re.IGNORECASE)
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
        
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(chapters, f, indent=4, ensure_ascii=False)
        
    # Also create a compressed version
    compressed_file = os.path.join(SCRIPT_DIR, '..', 'data.js')
    with open(compressed_file, 'w', encoding='utf-8') as f:
        f.write('var wordsData = ')
        json.dump(chapters, f, ensure_ascii=True)
        f.write(';')
        
    print(f"Converted {len(chapters)} chapters.")

if __name__ == "__main__":
    main()
