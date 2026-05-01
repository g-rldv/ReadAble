# Picture Word Game - PNG Image Setup Guide

## Directory Structure

Create the following directory in your frontend public folder:

```
frontend/public/
└── images/
    └── activities/
        └── picture-word/
```

## PNG Naming Convention

For Picture Word activities, name your PNG files with this format:

```
{activity_id}_{item_index}_{word}.png
```

### Example:

If you have an activity with ID `25` containing 3 items (cat, dog, bird):

```
25_0_cat.png
25_1_dog.png
25_2_bird.png
```

## Database Content Structure

Your `activities` table `content` field should look like this for picture_word type:

```json
{
  "instruction": "Look at each picture and choose the correct word.",
  "items": [
    {
      "picture": "25_0_cat.png",
      "options": ["cat", "dog", "bird", "mouse"]
    },
    {
      "picture": "25_1_dog.png",
      "options": ["cat", "dog", "sheep", "bear"]
    },
    {
      "picture": "25_2_bird.png",
      "options": ["plane", "bird", "butterfly", "bee"]
    }
  ]
}
```

## Correct Answer Structure

The `correct_answer` field should be:

```json
{
  "answers": ["cat", "dog", "bird"]
}
```

## Image Requirements

- **Format:** PNG with transparency supported
- **Size:** Recommended 300x300px or larger (will scale down)
- **Quality:** High quality, clear and recognizable
- **Style:** Consistent visual style across all images for an activity

## File Path in Frontend

The component will look for images at:

```
/public/images/activities/{picture_filename}
```

So if your filename is `25_0_cat.png`, the full path will be:

```
/public/images/activities/25_0_cat.png
```

## Steps to Upload

1. Create PNG files following the naming convention
2. Place them in `frontend/public/images/activities/`
3. Update your database `activities.content` with the correct filenames
4. Update `activities.correct_answer` with the matching answers

## Error Handling

If an image fails to load, the component will display:
- An error icon
- The filename that failed to load
- The user can still proceed with the activity
