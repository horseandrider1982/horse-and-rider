
ALTER TABLE public.redirect_edges
  DROP CONSTRAINT redirect_edges_redirect_id_fkey,
  ADD CONSTRAINT redirect_edges_redirect_id_fkey
    FOREIGN KEY (redirect_id)
    REFERENCES public.redirects(id)
    ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;
