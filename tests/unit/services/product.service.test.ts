import {ProductService} from '../../../src/services/product.service';
import Product from '../../../src/models/product.model';
import { redis } from '../../../src/config/redis';

jest.mock("../../../src/models/product.model");
jest.mock('../../../src/config/redis',()=>({
    redis:{
        get:jest.fn(),
        set:jest.fn()
    },
}))

describe("Product service unit test",()=>{

    afterEach(()=>{
        jest.clearAllMocks();
    })

    describe("get Products",()=>{
        it("should return cached data if present in the redis",async ()=>{

            const fakeResponse={
                data:[{title:"Test product"}],
                pagination:{
                    total:1,
                    page:1,
                    limit:20,
                    totalPages:1
                }
            };
            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(fakeResponse));

            const result=await ProductService.getProducts({});
            
            expect (redis.get).toHaveBeenCalled();
            expect(result).toEqual(fakeResponse);
            expect(Product.countDocuments).not.toHaveBeenCalled();

            
        })

        it("shoule query database and cache result if cache miss ",async ()=>{
            (redis.get as jest.Mock).mockResolvedValue(null);
            (Product.countDocuments as jest.Mock).mockResolvedValue(2);
            const mockFind = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([
                { title: "Product 1" },
                { title: "Product 2" }
                ]),
            };
            (Product.find as jest.Mock).mockReturnValue(mockFind);

            const result= await ProductService.getProducts({
                page: 1,
                limit: 2,
                sortBy: "price",
                order: "asc"
            });
            expect(Product.countDocuments).toHaveBeenCalled();
            expect(Product.find).toHaveBeenCalled();
            expect(redis.set).toHaveBeenCalled();

            expect(result.pagination.total).toBe(2);
            expect(result.pagination.totalPages).toBe(1);

        });
        it("should apply search filter correctly", async () => {

            (redis.get as jest.Mock).mockResolvedValue(null);
            (Product.countDocuments as jest.Mock).mockResolvedValue(0);

            const mockFind = {
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockResolvedValue([]),
            };

            (Product.find as jest.Mock).mockReturnValue(mockFind);

            await ProductService.getProducts({
                search: "iphone"
            });

            const filtersPassed = (Product.countDocuments as jest.Mock).mock.calls[0][0];

            expect(filtersPassed.$text).toBeDefined();
            expect(filtersPassed.$text.$search).toBe("iphone");
        });

        
    })
    describe("getProductByUniqId", () => {

        it("should return cached product if exists", async () => {

            const fakeProduct = { uniqId: "123", title: "Cached Product" };

            (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(fakeProduct));

            const result = await ProductService.getProductByUniqId("123");

            expect(result).toEqual(fakeProduct);
            expect(Product.findOne).not.toHaveBeenCalled();
            });


        it("should fetch from DB and cache it if not cached", async () => {

            (redis.get as jest.Mock).mockResolvedValue(null);

            const mockLean = jest.fn().mockResolvedValue({
                uniqId: "123",
                title: "DB Product"
            });

            (Product.findOne as jest.Mock).mockReturnValue({
                lean: mockLean
            });

            const result = await ProductService.getProductByUniqId("123");

            expect(Product.findOne).toHaveBeenCalledWith({ uniqId: "123" });
            expect(redis.set).toHaveBeenCalled();
            expect(result?.uniqId).toBe("123");
    })
    })

})