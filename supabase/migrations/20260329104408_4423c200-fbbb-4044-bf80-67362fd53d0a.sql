
ALTER TABLE public.cms_menu_items 
ADD COLUMN parent_id uuid REFERENCES public.cms_menu_items(id) ON DELETE CASCADE DEFAULT NULL;

CREATE INDEX idx_cms_menu_items_parent ON public.cms_menu_items(parent_id);
