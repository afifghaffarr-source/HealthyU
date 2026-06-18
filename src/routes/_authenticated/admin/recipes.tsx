import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  Eye,
  EyeOff,
  Trash2,
  Image as ImageIcon,
  ImageOff,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
} from "lucide-react";
import {
  listRecipesAdmin,
  toggleRecipePublish,
  deleteRecipeAdmin,
  type RecipeListItem,
} from "@/features/admin/lib/adminRecipes.functions";

export const Route = createFileRoute("/_authenticated/admin/recipes")({
  component: AdminRecipesPage,
});

const PAGE_SIZE = 25;

function AdminRecipesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<RecipeListItem | null>(null);

  // Debounce search
  const debounceTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const updateSearch = (v: string) => {
    setSearch(v);
    if (debounceTimer[0]) clearTimeout(debounceTimer[0]);
    debounceTimer[1](
      setTimeout(() => {
        setDebouncedSearch(v);
        setPage(0);
      }, 300),
    );
  };

  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "recipes", debouncedSearch, category, page],
    queryFn: () =>
      listRecipesAdmin({
        data: {
          search: debouncedSearch || undefined,
          category: category || undefined,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      }),
    staleTime: 30_000,
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { id: string; isPublished: boolean }) => toggleRecipePublish({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "recipes"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRecipeAdmin({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "recipes"] });
      qc.invalidateQueries({ queryKey: ["admin", "overview"] });
      setConfirmDelete(null);
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 max-w-6xl">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Memuat…" : `${total} resep total`}
          </p>
        </div>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 bg-card rounded-2xl p-3 outline-1 outline-black/5">
        <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari judul, slug, deskripsi…"
            value={search}
            onChange={(e) => updateSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
          <Filter className="size-4 text-muted-foreground" />
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
            className="bg-transparent outline-none text-sm"
          >
            <option value="">Semua kategori</option>
            <option value="breakfast">Breakfast</option>
            <option value="snack">Snack</option>
            <option value="main">Main</option>
            <option value="sup">Sup</option>
            <option value="sayur">Sayur</option>
            <option value="lauk">Lauk</option>
            <option value="minuman">Minuman</option>
            <option value="salad">Salad</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
          <p className="text-sm text-destructive font-mono">{(error as Error).message}</p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 text-center">
          <p className="text-muted-foreground">Tidak ada resep ditemukan.</p>
        </div>
      ) : data ? (
        <div className="bg-card rounded-2xl outline-1 outline-black/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Resep
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Kategori
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  Nutrisi
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium line-clamp-1">{r.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">/{r.slug}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                      {r.category ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs font-mono text-muted-foreground">
                    {r.calories ?? "—"} kcal · {r.prep_min ?? "—"} min
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {r.is_published ? (
                        <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          Published
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                          Draft
                        </span>
                      )}
                      {r.has_image_file ? (
                        <ImageIcon className="size-3 text-emerald-600" />
                      ) : r.image_url ? (
                        <ImageIcon className="size-3 text-muted-foreground" />
                      ) : (
                        <ImageOff className="size-3 text-amber-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to="/resep/$slug"
                        params={{ slug: r.slug ?? r.id }}
                        target="_blank"
                        rel="noopener"
                        className="p-1.5 rounded-lg hover:bg-muted"
                        title="Lihat publik"
                      >
                        <ExternalLink className="size-3.5 text-muted-foreground" />
                      </Link>
                      <button
                        onClick={() => toggleMut.mutate({ id: r.id, isPublished: !r.is_published })}
                        disabled={toggleMut.isPending}
                        className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
                        title={r.is_published ? "Unpublish" : "Publish"}
                      >
                        {r.is_published ? (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        ) : (
                          <Eye className="size-3.5 text-muted-foreground" />
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r)}
                        disabled={deleteMut.isPending}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 disabled:opacity-50"
                        title="Hapus"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-black/5 bg-muted/30">
              <p className="text-xs text-muted-foreground">
                Halaman {page + 1} dari {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl p-6 max-w-md w-full">
            <h3 className="font-bold text-lg">Hapus resep?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{confirmDelete.title}</span>
              <br />
              slug: <code className="bg-muted px-1 rounded text-xs">/{confirmDelete.slug}</code>
            </p>
            <p className="text-xs text-destructive mt-3">
              Tindakan ini menghapus dari tabel recipes dan seo_recipes. Tidak bisa dibatalkan.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted font-medium"
              >
                Batal
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                disabled={deleteMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium flex items-center justify-center gap-2"
              >
                {deleteMut.isPending && <Loader2 className="size-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
