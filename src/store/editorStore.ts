 
 
import { create } from 'zustand';
import { EditorLayer } from '../app/(create)/story-editor';
import { ReelTimelineData } from '../components/editor/ReelTimelineEditor';

interface EditorState {
  layers: EditorLayer[];
  timelineData: ReelTimelineData | null;
  musicData: any | null;
  
  setEditorData: (data: {
    layers: EditorLayer[];
    timelineData: ReelTimelineData | null;
    musicData: any | null;
  }) => void;
  
  clearEditorData: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  layers: [],
  timelineData: null,
  musicData: null,
  
  setEditorData: (data) => set({
    layers: data.layers,
    timelineData: data.timelineData,
    musicData: data.musicData,
  }),
  
  clearEditorData: () => set({
    layers: [],
    timelineData: null,
    musicData: null,
  }),
}));
