# load json file

import json
import os

from regex import sub

important_item_attributes = [
    'nrInLabJournal',
    'creator',
    'code',
    'modifier'
    'reactionTitle',
    'reactionStartedWhen',
    'realizationText',
    'observationText',
]

important_reaction_properties = [
    'duration',
    'reaction_mass_unit',
    'reaction_volume_unit',
    'solventAmount'
    'solvent_volume_unit',
    'temperature'
]

important_reaction_component_attributes = [
    'moleculeName',
    'casNr',
    'mw',
    'empFormula',
    'concentration',
    'concentrationUnit',
    'smiles',
    'density20',
    'rxnRole',
    'mass',
    'massUnit',
    'volume',
    'volumeUnit',
    'amount',
    'amountUnit',
    'measured'
    'elnReaction'
    'cdbMolecule'
    'rxnRole',
]

rxnRoleMapping = {
    1: 'reactant',
    2: 'reagent',
    3: 'solvent',
    6: 'product'
}

def load_json(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data

def save_json(data, file_path):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)


def format_to_camel_case(text: str):
    if "_" in text or "-" in text:
        s = sub(r"(_|-)+", " ", text).title().replace(" ", "")
        return ''.join([s[0].lower(), s[1:]])
    else:
        return text


def clean_data(data):
    trimmed_data = []
    for item in data:
        result = clean_item(item)
        if result:
            trimmed_data.append(result)
    return trimmed_data

def clean_item(item):
    new_item = {}
    for key, value in item.items():
        if key in important_item_attributes:
            new_item[format_to_camel_case(key)] = value

    elnReactionPropertyCollection = item.get('elnReactionPropertyCollection', [])
    if elnReactionPropertyCollection:
        for reactionProperty in elnReactionPropertyCollection:
            if reactionProperty.get('name') in important_reaction_properties:
                new_item[format_to_camel_case(reactionProperty.get('name'))] = reactionProperty.get('strValue')

    elnReactionComponentCollection = item.get('elnReactionComponentCollection', [])
    if elnReactionComponentCollection:
        reaction_components = []
        for reactionComponent in elnReactionComponentCollection:
            new_component = {}
            for key, value in reactionComponent.items():
                if key in important_reaction_component_attributes:
                    new_component[key] = value
            reaction_components.append(new_component)
        new_item['reactionComponents'] = reaction_components

    return new_item


def applyConversions(data):
    # convert rxnRole int to string
    for item in data:
        for component in item['reactionComponents']:
            component['rxnRole'] = rxnRoleMapping.get(component['rxnRole'], 'unknown')
    return data


if __name__ == '__main__':
    file_path = os.path.join('data', 'KE-TAPP TPA 203exp.json')
    data = load_json(file_path)
    print("Input data:")
    print(data)

    trimmed_data = clean_data(data)
    print("Trimmed data:")
    print(trimmed_data)

    postprocessed_data = applyConversions(trimmed_data)
    print("Postprocessed data:")
    print(postprocessed_data)

    result = {
        "experiments": postprocessed_data
    }

    save_json(result, 'cleaned_data.json')