using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Shared.Slugs;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent catalog seeder for Development. Creates a small set of
/// apparel categories and products with picsum.photos image URLs so the
/// frontend has something to render while admin upload (M4) is not yet
/// built. Each product gets a full Size × Color variant matrix.
///
/// Activated only when <c>Catalog:SeedSamples=true</c>. Skips if any
/// product already exists in the database.
/// </summary>
public sealed class DevCatalogSeeder
{
    private readonly AppDbContext _db;
    private readonly ILogger<DevCatalogSeeder> _logger;

    public DevCatalogSeeder(AppDbContext db, ILogger<DevCatalogSeeder> logger)
    {
        _db = db;
        _logger = logger;
    }

    // -------------------------------------------------------------------------
    // Reusable colour palette. Hex codes match the swatch displays in the SPA.
    // -------------------------------------------------------------------------
    private static readonly Color Navy       = new("Navy",       "كحلي",        "#1A2C5C");
    private static readonly Color Black      = new("Black",      "أسود",        "#0E0E10");
    private static readonly Color Teal       = new("Teal",       "تركواز",      "#186F76");
    private static readonly Color Wine       = new("Wine",       "نبيذي",        "#7A1F2C");
    private static readonly Color SageGreen  = new("Sage Green", "أخضر مريمي",  "#87A96B");
    private static readonly Color Plum       = new("Plum",       "بنفسجي",      "#4E2C40");
    private static readonly Color HotPink    = new("Hot Pink",   "وردي زاهي",   "#E83E8C");
    private static readonly Color Olive      = new("Olive",      "زيتي",         "#4F5D2F");
    private static readonly Color Charcoal   = new("Charcoal",   "رصاصي داكن",  "#2A2D32");
    private static readonly Color White      = new("White",      "أبيض",        "#F5F5F5");
    private static readonly Color BlushPink  = new("Blush Pink", "وردي هادئ",   "#E8B4BE");

    private static readonly string[] ApparelSizes = ["XS", "S", "M", "L", "XL", "XXL"];
    private static readonly string[] ApparelSizesNoXS = ["S", "M", "L", "XL", "XXL"];
    private static readonly string[] ApparelSizesNoXXL = ["XS", "S", "M", "L", "XL"];
    private static readonly string[] OneSize = ["OS"];
    private static readonly string[] FootwearFull = ["36", "37", "38", "39", "40", "41", "42", "43", "44"];
    private static readonly string[] FootwearWomen = ["36", "37", "38", "39", "40", "41", "42"];

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await _db.Products.AnyAsync(ct))
        {
            // Already seeded — never overwrite.
            return;
        }

        // ---------------------------------------------------------------------
        // Categories — apparel-only. Order chosen for the public nav.
        // ---------------------------------------------------------------------
        var scrubTops = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = "السكرابات العلوية",
            NameEn = "Scrub Tops",
            Slug = "scrub-tops",
            DisplayOrder = 10,
        };
        var scrubPants = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = "السكرابات السفلية",
            NameEn = "Scrub Pants",
            Slug = "scrub-pants",
            DisplayOrder = 20,
        };
        var labCoats = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = "معاطف المعمل",
            NameEn = "Lab Coats",
            Slug = "lab-coats",
            DisplayOrder = 30,
        };
        var headwear = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = "طاقيات وغطاء الرأس",
            NameEn = "Surgical Headwear",
            Slug = "surgical-headwear",
            DisplayOrder = 40,
        };
        var footwear = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = "الأحذية الطبية",
            NameEn = "Medical Footwear",
            Slug = "medical-footwear",
            DisplayOrder = 50,
        };

        var categories = new[] { scrubTops, scrubPants, labCoats, headwear, footwear };
        _db.Categories.AddRange(categories);

        // ---------------------------------------------------------------------
        // Products + variants. Each ProductSeed describes one master record
        // and the colour / size matrix to generate buyable variants from.
        // ---------------------------------------------------------------------
        var seeds = new List<ProductSeed>
        {
            new(scrubTops,
                NameEn: "V-Neck Solid Scrub Top",
                NameAr: "بلوزة طبية بياقة V سادة",
                DescriptionEn: "Classic V-neck scrub top with chest and side pockets. Soft brushed fabric, easy-care wash, modern slim fit. A workhorse staple for long shifts.",
                DescriptionAr: "بلوزة طبية كلاسيكية بياقة V، مع جيوب صدر وجوانب. قماش ناعم سهل العناية، وقَصَّة عصرية رفيعة. الأنسب للورديات الطويلة.",
                Price: 285m,
                Gender: ProductGender.Men,
                Material: "65% polyester / 35% cotton",
                Brand: "Cherokee",
                Sku: "CHK-VST-001",
                Colors: new[] { Navy, Black, Teal, Wine },
                Sizes: ApparelSizes,
                ImagesPerColor: 1),

            new(scrubTops,
                NameEn: "Mock Wrap Scrub Top",
                NameAr: "بلوزة طبية بقَصَّة لف",
                DescriptionEn: "Flattering mock-wrap silhouette with princess seams and a four-way-stretch performance blend. Antimicrobial finish keeps things fresh through a 12-hour shift.",
                DescriptionAr: "بلوزة بقَصَّة لف أنيقة وخياطات أميرات، من خامة بأربع اتجاهات تمدد. تشطيب مضاد للبكتيريا يحافظ على الانتعاش طوال 12 ساعة.",
                Price: 345m,
                Gender: ProductGender.Women,
                Material: "77% polyester / 20% rayon / 3% spandex",
                Brand: "FIGS",
                Sku: "FIGS-MW-002",
                Colors: new[] { Black, Plum, SageGreen, HotPink },
                Sizes: ApparelSizesNoXXL,
                ImagesPerColor: 1),

            new(scrubPants,
                NameEn: "Cargo Drawstring Scrub Pant",
                NameAr: "بنطلون طبي بأربطة وجيوب جانبية",
                DescriptionEn: "Mid-rise cargo scrub pant with elastic-back drawstring waist and six functional pockets. Tapered leg, no-shrink fabric, reinforced stitching.",
                DescriptionAr: "بنطلون طبي متوسط الخصر بأربطة وحزام مطاطي خلفي، مع ستة جيوب عملية. ساق متدرج وقماش لا يتقلص وخياطات معززة.",
                Price: 315m,
                Gender: ProductGender.Men,
                Material: "55% cotton / 42% polyester / 3% spandex",
                Brand: "Dickies",
                Sku: "DCK-CRG-003",
                Colors: new[] { Navy, Black, Charcoal },
                Sizes: ApparelSizesNoXS,
                ImagesPerColor: 1),

            new(scrubPants,
                NameEn: "Jogger Slim Scrub Pant",
                NameAr: "بنطلون طبي جوغر بقَصَّة ضيقة",
                DescriptionEn: "Modern jogger cut with ribbed cuffs and zip pockets. Performance four-way-stretch fabric moves with you through every shift.",
                DescriptionAr: "قصة جوغر عصرية بأساور مطاطية وجيوب بسحاب. خامة بأربع اتجاهات تمدد للحركة الكاملة طوال الوردية.",
                Price: 365m,
                Gender: ProductGender.Unisex,
                Material: "Performance microfibre — 88% polyester / 12% spandex",
                Brand: "FIGS",
                Sku: "FIGS-JOG-004",
                Colors: new[] { Black, Navy, Olive },
                Sizes: ApparelSizes,
                ImagesPerColor: 1),

            new(labCoats,
                NameEn: "Knee-Length Classic Lab Coat",
                NameAr: "معطف مختبر كلاسيكي بطول الركبة",
                DescriptionEn: "Traditional five-button lab coat in heavyweight twill. Three patch pockets, notched lapel, back belt for a tailored finish. Easy bleach-safe wash.",
                DescriptionAr: "معطف مختبر كلاسيكي بخمسة أزرار من قماش تويل سميك. ثلاثة جيوب بارزة وياقة بشقوق وحزام خلفي لمظهر منسق. غسيل آمن مع المبيض.",
                Price: 485m,
                Gender: ProductGender.Unisex,
                Material: "65% polyester / 35% cotton twill",
                Brand: "Grey's Anatomy",
                Sku: "GA-LCC-005",
                Colors: new[] { White },
                Sizes: ApparelSizesNoXS,
                ImagesPerColor: 2),

            new(labCoats,
                NameEn: "Hip-Length Modern Lab Coat",
                NameAr: "معطف مختبر عصري بطول الورك",
                DescriptionEn: "Tailored hip-length coat with princess seams and a slim silhouette. Stain-release finish; designed for office, clinic, and rounds.",
                DescriptionAr: "معطف عصري بطول الورك بخياطات أميرات وقَصَّة رفيعة. تشطيب مقاوم للبقع. مناسب للمكتب والعيادة والجولات.",
                Price: 545m,
                Gender: ProductGender.Women,
                Material: "Performance twill — stain release",
                Brand: "FIGS",
                Sku: "FIGS-LCH-006",
                Colors: new[] { White },
                Sizes: ApparelSizesNoXXL,
                ImagesPerColor: 2),

            new(headwear,
                NameEn: "Tie-Back Scrub Cap",
                NameAr: "طاقية جراحية بأربطة خلفية",
                DescriptionEn: "Adjustable tie-back surgical cap with sweatband lining. One-size fits most; machine-washable cotton blend.",
                DescriptionAr: "طاقية جراحية بأربطة خلفية قابلة للتعديل وبطانة ماصة للعرق. مقاس واحد يناسب الجميع. خامة قطنية قابلة للغسل.",
                Price: 85m,
                Gender: ProductGender.Unisex,
                Material: "100% cotton",
                Brand: "Healing Hands",
                Sku: "HH-TBC-007",
                Colors: new[] { Navy, Black, Teal, Plum },
                Sizes: OneSize,
                ImagesPerColor: 1),

            new(headwear,
                NameEn: "Bouffant Scrub Cap",
                NameAr: "طاقية جراحية موديل بوفان",
                DescriptionEn: "Roomy bouffant cap with elastic band — fits long hair comfortably. Soft-touch poly-cotton, autoclave-safe.",
                DescriptionAr: "طاقية بوفان واسعة بحزام مطاطي تستوعب الشعر الطويل بسهولة. خامة قطنية ناعمة، آمنة للتعقيم.",
                Price: 75m,
                Gender: ProductGender.Unisex,
                Material: "60% cotton / 40% polyester",
                Brand: "Cherokee",
                Sku: "CHK-BFC-008",
                Colors: new[] { Navy, Black, Teal },
                Sizes: OneSize,
                ImagesPerColor: 1),

            new(footwear,
                NameEn: "Slip-Resistant Medical Clogs",
                NameAr: "كروكس طبية مضادة للانزلاق",
                DescriptionEn: "Lightweight EVA clogs with slip-resistant tread and contoured arch support. Closed-toe protection rated for hospital floors.",
                DescriptionAr: "كروكس طبية خفيفة من خامة EVA مع نعل مضاد للانزلاق ودعم لقوس القدم. مغلقة من الأمام للحماية في أرضيات المستشفى.",
                Price: 525m,
                Gender: ProductGender.Unisex,
                Material: "EVA upper + slip-resistant rubber outsole",
                Brand: "Crocs",
                Sku: "CRC-CLG-009",
                Colors: new[] { White, Black },
                Sizes: FootwearFull,
                ImagesPerColor: 1),

            new(footwear,
                NameEn: "Memory Foam Medical Sneaker",
                NameAr: "حذاء طبي بنعل ميموري فوم",
                DescriptionEn: "All-day memory-foam medical sneaker with breathable mesh upper and slip-resistant rubber sole. Designed for 12-hour clinic shifts.",
                DescriptionAr: "حذاء طبي بنعل ميموري فوم لراحة طوال اليوم، علوي شبك متهوي ونعل مطاط مضاد للانزلاق. مصمم لورديات العيادة الطويلة.",
                Price: 615m,
                Gender: ProductGender.Women,
                Material: "Engineered mesh upper, memory-foam insole, rubber outsole",
                Brand: "Skechers",
                Sku: "SKX-MFS-010",
                Colors: new[] { White, BlushPink, Navy },
                Sizes: FootwearWomen,
                ImagesPerColor: 1),
        };

        var taken = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var products = new List<Product>();
        var images = new List<ProductImage>();
        var variants = new List<ProductVariant>();
        var rng = new Random(20260514); // deterministic stock numbers

        foreach (var seed in seeds)
        {
            var slug = SlugGenerator.MakeUnique(SlugGenerator.Slugify(seed.NameEn), taken);
            taken.Add(slug);

            var product = new Product
            {
                Id = Guid.NewGuid(),
                CategoryId = seed.Category.Id,
                NameAr = seed.NameAr,
                NameEn = seed.NameEn,
                Slug = slug,
                DescriptionAr = seed.DescriptionAr,
                DescriptionEn = seed.DescriptionEn,
                Price = seed.Price,
                Gender = seed.Gender,
                Material = seed.Material,
                Brand = seed.Brand,
                Sku = seed.Sku,
                IsPublished = true,
            };
            products.Add(product);

            // Color-keyed gallery: each colour gets its own picsum image set so
            // the SPA can swap the gallery when a buyer picks a different colour.
            var displayOrder = 0;
            foreach (var color in seed.Colors)
            {
                for (var i = 0; i < seed.ImagesPerColor; i++)
                {
                    var imageSeed = $"{slug}-{SlugGenerator.Slugify(color.Name)}-{i}";
                    images.Add(new ProductImage
                    {
                        Id = Guid.NewGuid(),
                        ProductId = product.Id,
                        Url = $"https://picsum.photos/seed/{imageSeed}/1200/900",
                        Alt = $"{seed.NameEn} — {color.Name}",
                        DisplayOrder = displayOrder++,
                    });
                }
            }

            // Variant matrix: every (color × size) combo gets a row.
            foreach (var color in seed.Colors)
            {
                var colorSlug = SlugGenerator.Slugify(color.Name).ToUpperInvariant();
                foreach (var size in seed.Sizes)
                {
                    variants.Add(new ProductVariant
                    {
                        Id = Guid.NewGuid(),
                        ProductId = product.Id,
                        Size = size,
                        ColorName = color.Name,
                        ColorNameAr = color.NameAr,
                        ColorHex = color.Hex,
                        Sku = $"{seed.Sku}-{size}-{colorSlug}",
                        // Random in-stock count between 4 and 24 so the UI can
                        // exercise low-stock and ample-stock states.
                        Stock = rng.Next(4, 25),
                        IsActive = true,
                    });
                }
            }
        }

        _db.Products.AddRange(products);
        _db.ProductImages.AddRange(images);
        _db.ProductVariants.AddRange(variants);

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Seeded {Categories} categories, {Products} products, {Images} images, {Variants} variants.",
            categories.Length, products.Count, images.Count, variants.Count);
    }

    // -------------------------------------------------------------------------
    // Local data record types — kept private to the seeder.
    // -------------------------------------------------------------------------
    private sealed record Color(string Name, string NameAr, string Hex);

    private sealed record ProductSeed(
        Category Category,
        string NameEn,
        string NameAr,
        string DescriptionEn,
        string DescriptionAr,
        decimal Price,
        ProductGender Gender,
        string Material,
        string Brand,
        string Sku,
        Color[] Colors,
        string[] Sizes,
        int ImagesPerColor);
}
