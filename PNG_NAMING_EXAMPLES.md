# Picture Word Game - PNG File Naming Examples

## Folder Location
```
frontend/public/images/activities/
```

## Example Files to Create

### Activity 1 - Animals (4 items)
Place these PNG files in `frontend/public/images/activities/`:

```
1_0_cat.png          ← First item (index 0)
1_1_dog.png          ← Second item (index 1)
1_2_bird.png         ← Third item (index 2)
1_3_fish.png         ← Fourth item (index 3)
```

### Activity 2 - Fruits (4 items)
```
2_0_apple.png
2_1_banana.png
2_2_orange.png
2_3_grape.png
```

### Activity 3 - Vehicles (3 items)
```
3_0_car.png
3_1_bus.png
3_2_bike.png
```

## Naming Pattern

```
{ACTIVITY_ID}_{ITEM_INDEX}_{WORD_NAME}.png
```

**Rules:**
- `ACTIVITY_ID`: The ID number of the activity from database
- `ITEM_INDEX`: Starting from 0 (0, 1, 2, 3...)
- `WORD_NAME`: Lowercase, no spaces, use underscores for multiple words
  - Example: `big_tree.png` ✓
  - Example: `big-tree.png` ✗ (use underscore, not dash)
  - Example: `Big Tree.png` ✗ (use lowercase)

## Database Setup Example

For Activity ID 1 (Animals), your database entries should be:

**Content Field (JSONB):**
```json
{
  "instruction": "Look at each picture and choose the correct word.",
  "items": [
    {
      "picture": "1_0_cat.png",
      "options": ["cat", "dog", "bird", "fish"]
    },
    {
      "picture": "1_1_dog.png",
      "options": ["cat", "dog", "shark", "mouse"]
    },
    {
      "picture": "1_2_bird.png",
      "options": ["butterfly", "bird", "duck", "penguin"]
    },
    {
      "picture": "1_3_fish.png",
      "options": ["fish", "shark", "whale", "seal"]
    }
  ]
}
```

**Correct Answer Field (JSONB):**
```json
{
  "answers": ["cat", "dog", "bird", "fish"]
}
```

## Quick Checklist

When creating your PNG files:
- [ ] File is in `frontend/public/images/activities/`
- [ ] Filename follows pattern: `{id}_{index}_{word}.png`
- [ ] All letters are lowercase
- [ ] No spaces in filename (use underscores)
- [ ] First item starts with index 0, not 1
- [ ] PNG file is actual image, not empty file

## Steps

1. Create folder: `frontend/public/images/activities/`
2. Create your PNG images with proper names
3. Update database `activities.content` with matching filenames
4. Update database `activities.correct_answer` with matching answers
5. Test the activity in the app!
