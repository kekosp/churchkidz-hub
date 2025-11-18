-- Allow parents to insert children with themselves as parent
CREATE POLICY "Parents can insert own children" ON children
FOR INSERT
WITH CHECK (parent_id = auth.uid());

-- Allow servants to insert children assigned to them
CREATE POLICY "Servants can insert assigned children" ON children  
FOR INSERT
WITH CHECK (servant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));