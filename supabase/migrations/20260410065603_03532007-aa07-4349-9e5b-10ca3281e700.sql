
-- Drop existing FKs that point to auth.users
ALTER TABLE public.procurement_requests DROP CONSTRAINT IF EXISTS procurement_requests_requester_id_fkey;
ALTER TABLE public.approval_steps DROP CONSTRAINT IF EXISTS approval_steps_approver_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_from_user_id_fkey;
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_to_user_id_fkey;

-- Recreate FKs pointing to public.profiles
ALTER TABLE public.procurement_requests
  ADD CONSTRAINT procurement_requests_requester_id_fkey
  FOREIGN KEY (requester_id) REFERENCES public.profiles(id);

ALTER TABLE public.approval_steps
  ADD CONSTRAINT approval_steps_approver_id_fkey
  FOREIGN KEY (approver_id) REFERENCES public.profiles(id);

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.comments
  ADD CONSTRAINT comments_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES public.profiles(id);

ALTER TABLE public.comments
  ADD CONSTRAINT comments_to_user_id_fkey
  FOREIGN KEY (to_user_id) REFERENCES public.profiles(id);
