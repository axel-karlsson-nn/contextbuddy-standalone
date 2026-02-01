import { deleteNote, getLastNote } from '../storage/notes.js';

export const deleteNoteTool = {
  name: 'cb_delete_note',
  description: 'Delete a note by ID, or delete the most recent note (for undo)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'The ID of the note to delete. If not provided, deletes the most recent note.'
      }
    },
    required: []
  },
  handler: async (args: { id?: string }) => {
    let noteId = args.id;

    // If no ID provided, get the last note
    if (!noteId) {
      const lastNote = getLastNote();
      if (!lastNote) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'No notes to delete.'
            }
          ]
        };
      }
      noteId = lastNote.id;
    }

    const result = deleteNote(noteId);

    if (result.deleted && result.note) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Deleted: "${result.note.content}" (${result.note.type})`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Note not found with ID: ${noteId}`
          }
        ]
      };
    }
  }
};
