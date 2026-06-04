INSERT INTO int_menu (
    menu_id, menu_nm, menu_sn, adm_yn, use_yn,
    crt_at, crt_by, crt_ip, upd_at, upd_by, upd_ip
)
SELECT
    'rpt-form', '보고 관리',
    COALESCE(MAX(menu_sn), 0) + 1,
    'Y', 'Y',
    CURRENT_TIMESTAMP, 'system', '127.0.0.1',
    CURRENT_TIMESTAMP, 'system', '127.0.0.1'
FROM int_menu
WHERE adm_yn = 'Y'
HAVING NOT EXISTS (SELECT 1 FROM int_menu WHERE menu_id = 'rpt-form');
