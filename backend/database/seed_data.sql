INSERT INTO approval_level (level_id, level_name, sequence_order, limit_amount) VALUES
('LV1', 'Senior Chief',            1, NULL),       
('LV2', 'Manager',                 2, 10000.00),
('LV3', 'Deputy General Manager',  3, 50000.00),
('LV4', 'General Manager',         4, 100000.00),
('LV5', 'Senior Director',         5, 200000.00),
('LV6', 'Vice President',          6, NULL);       

INSERT INTO employee (employee_id, full_name, position, department, approval_level_id, passcode_hash, signature_image) VALUES
('E0020', 'Mr. A', 'IT Support',       'IT Department', NULL,  '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', NULL),
('E0018', 'Mr. B', 'Senior Chief',     'IT Department', 'LV1', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0018.png'),
('E0017', 'Mr. C', 'IT Manager',       'IT Department', 'LV2', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0017.png'),
('E0015', 'Mr. D', 'DGM',              'IT Department', 'LV3', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0015.png'),
('E0010', 'Mr. E', 'General Manager',  'IT Department', 'LV4', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0010.png'),
('E0005', 'Mr. F', 'Senior Director',  'IT Department', 'LV5', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0005.png'),
('E0002', 'Mr. G', 'Vice President',   'IT Department', 'LV6', '$2b$10$C7DB1glkd3lu6l7dHcP45ufJ7.MsWvBy21HJSPfK1d5RV8JX3i8iC', '/signatures/e0002.png');

INSERT INTO pr (pr_id, pr_no, requester_id, require_date, job_name, purpose, asset_type, vendor_name, status, created_at) VALUES
('PR0001', 'IT-001-PR', 'E0020', '2026-08-01 00:00:00', 'Notebook',
 'Replace the old one', 'Office Supply', 'ABC Company', 'approved', '2026-07-01 09:00:00');

INSERT INTO pr_item (item_id, pr_id, description, qty, unit, unit_price) VALUES
('ITM0001', 'PR0001', 'Notebook HP ; Model 123456', 5, 'set', 22000.00);

INSERT INTO attachment (attachment_id, pr_id, file_type, file_path, uploaded_at) VALUES
('ATT0001', 'PR0001', 'quotation', '/files/pr0001/quotation.pdf', '2026-07-01 09:05:00'),
('ATT0002', 'PR0001', 'spec',      '/files/pr0001/spec.pdf',      '2026-07-01 09:05:00');


INSERT INTO approval_log (log_id, pr_id, approver_id, level_id, job_action, comment, signature_applied, approved_at, created_at) VALUES
('LOG0001', 'PR0001', 'E0018', 'LV1', 'approved', NULL, TRUE, '2026-07-02 10:00:00', '2026-07-02 10:00:00'),
('LOG0002', 'PR0001', 'E0017', 'LV2', 'approved', NULL, TRUE, '2026-07-04 10:00:00', '2026-07-04 10:00:00'),
('LOG0003', 'PR0001', 'E0015', 'LV3', 'approved', NULL, TRUE, '2026-07-04 14:00:00', '2026-07-04 14:00:00'),
('LOG0004', 'PR0001', 'E0010', 'LV4', 'approved', NULL, TRUE, '2026-07-05 09:00:00', '2026-07-05 09:00:00'),
('LOG0005', 'PR0001', 'E0005', 'LV5', 'approved', NULL, TRUE, '2026-07-05 15:00:00', '2026-07-05 15:00:00');