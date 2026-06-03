
CREATE POLICY "own progress photo read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own progress photo insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own progress photo delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
