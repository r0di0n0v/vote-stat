function filterTable(catId) {
    document.querySelectorAll('#stat_tbl [data-cat_id]').forEach((elem) => {
        const elemCatId = elem.getAttribute('data-cat_id');
        if (elemCatId == catId || catId == -1) {
            elem.classList.remove('hidden');
        } else {
            elem.classList.add('hidden');
        }
    })
}